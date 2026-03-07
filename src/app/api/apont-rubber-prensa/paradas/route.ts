import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      },
      db: { schema: "apont_rubber_prensa" }
    }
  );
}

// PATCH: Justificar uma parada
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { parada_id, motivo_id } = body;

    if (!parada_id || !motivo_id) {
      return NextResponse.json({ error: "Campos obrigatórios: parada_id, motivo_id" }, { status: 400 });
    }

    // Busca a parada atual para saber se é órfã ou vinculada a sessão
    const { data: paradaAtual } = await supabase
      .from("paradas_maquina")
      .select("sessao_id, maquina_id, inicio_parada")
      .eq("id", parada_id)
      .single();

    if (!paradaAtual) {
      return NextResponse.json({ error: "Parada não encontrada" }, { status: 404 });
    }

    // PARADA ÓRFÃ: apenas atribui motivo (não fecha, fica aberta até iniciar produção)
    if (paradaAtual.sessao_id === null) {
      const { data, error } = await supabase
        .from("paradas_maquina")
        .update({ motivo_id, justificada: true })
        .eq("id", parada_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data }, { status: 200 });
    }

    // PARADA DE SESSÃO (TIMEOUT 1.6x): fecha a sessão e converte para órfã
    // 1. Busca TODAS as sessões ativas da máquina
    const { data: sessoesAtivas } = await supabase
      .from("sessoes_producao")
      .select("id, produto_codigo, operador_matricula")
      .eq("maquina_id", paradaAtual.maquina_id)
      .eq("status", "em_andamento");

    // 2. Para cada sessão, calcula qtd_produzida e fecha
    for (const sessao of (sessoesAtivas || [])) {
      // Busca o último pulso para determinar o fim_sessao
      const { data: ultimoPulso } = await supabase
        .from("pulsos_producao")
        .select("timestamp_ciclo")
        .eq("sessao_id", sessao.id)
        .order("timestamp_ciclo", { ascending: false })
        .limit(1)
        .maybeSingle();

      const fimSessao = ultimoPulso?.timestamp_ciclo || paradaAtual.inicio_parada;

      // Conta produção total
      const { data: pulsos } = await supabase
        .from("pulsos_producao")
        .select("qtd_pecas")
        .eq("sessao_id", sessao.id);

      const qtdProduzida = (pulsos || []).reduce((acc: number, p: any) => acc + (p.qtd_pecas || 0), 0);

      if (qtdProduzida > 0) {
        // Finaliza a sessão
        await supabase
          .from("sessoes_producao")
          .update({
            status: "finalizado",
            fim_sessao: fimSessao,
            qtd_produzida: qtdProduzida,
          })
          .eq("id", sessao.id);
      } else {
        // Sessão sem produção: remove (cancelamento limpo)
        await supabase.from("paradas_maquina").delete().eq("sessao_id", sessao.id);
        await supabase.from("pulsos_producao").delete().eq("sessao_id", sessao.id);
        await supabase.from("sessoes_producao").delete().eq("id", sessao.id);
      }
    }

    // 3. Converte a parada para órfã (sessao_id = null, fim_parada permanece NULL)
    const { data, error } = await supabase
      .from("paradas_maquina")
      .update({
        motivo_id,
        justificada: true,
        sessao_id: null, // Converte para órfã
      })
      .eq("id", parada_id)
      .select()
      .single();

    if (error) throw error;

    // 4. Remove outras paradas abertas das sessões finalizadas (evita lixo)
    if (sessoesAtivas && sessoesAtivas.length > 0) {
      const sessaoIds = sessoesAtivas.map(s => s.id);
      await supabase
        .from("paradas_maquina")
        .delete()
        .in("sessao_id", sessaoIds)
        .is("fim_parada", null)
        .neq("id", parada_id);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
