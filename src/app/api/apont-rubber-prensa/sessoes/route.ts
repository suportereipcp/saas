import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

// POST: Iniciar nova sessão de produção
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { maquina_id, produto_codigo, plato = 1, operador_matricula } = body;

    console.log("[INICIAR SESSAO API] PAYLOAD:", body);
    
    // Log para ver se estamos com service role ou anon no NextJS API context
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log("[INICIAR SESSAO API] Has Service Role Key no .env?", hasServiceRole);

    if (!maquina_id || !produto_codigo || !operador_matricula) {
      console.log("[INICIAR SESSAO API] Erro Validacao de campos!");
      return NextResponse.json({ error: "Campos obrigatórios: maquina_id, produto_codigo, operador_matricula" }, { status: 400 });
    }

    // Verifica se já existe sessão ativa para este plato desta máquina
    const { data: existing, error: errExist } = await supabase
      .from("sessoes_producao")
      .select("id")
      .eq("maquina_id", maquina_id)
      .eq("plato", plato)
      .eq("status", "em_andamento")
      .limit(1)
      .single();

    if (errExist && errExist.code !== "PGRST116") {
      console.error("[INICIAR SESSAO API] Erro consulta sessoes_producao (existente):", errExist);
      throw errExist;
    }

    if (existing) {
      return NextResponse.json({ error: `Plato ${plato} já possui sessão ativa` }, { status: 409 });
    }

    const { data, error } = await supabase.from("sessoes_producao").insert({
      maquina_id,
      produto_codigo,
      plato,
      operador_matricula,
      status: "em_andamento",
    }).select().single();

    if (error) {
      console.error("[INICIAR SESSAO API] Erro ao inserir sesso_producao:", error);
      throw error;
    }

    console.log("[INICIAR SESSAO API] Sucesso! ID:", data.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error("[INICIAR SESSAO API] FATAL ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Finalizar sessão de produção
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessao_id, total_refugo = 0 } = body;

    if (!sessao_id) {
      return NextResponse.json({ error: "Campo obrigatório: sessao_id" }, { status: 400 });
    }

    // Finaliza a sessão
    const { data, error } = await supabase
      .from("sessoes_producao")
      .update({
        status: "finalizado",
        fim_sessao: new Date().toISOString(),
        total_refugo,
      })
      .eq("id", sessao_id)
      .select("*")
      .single();

    if (error) throw error;

    // Conta total de peças produzidas na sessão
    const { count } = await supabase
      .from("pulsos_producao")
      .select("*", { count: "exact", head: true })
      .eq("sessao_id", sessao_id);

    // Insere na fila de exportação Datasul
    await supabase.from("export_datasul").insert({
      sessao_id,
      item_codigo: (data as any)?.produto_codigo || null,
      quantidade_total: count || 0,
      status_importacao: "pendente",
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
