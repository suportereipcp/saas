import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

// POST: Iniciar nova sessão de produção
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { maquina_id, produto_codigo, plato = 1, operador_matricula } = body;

    if (!maquina_id || !produto_codigo || !operador_matricula) {
      return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
    }

    const { data: existing, error: errExist } = await supabase
      .from("sessoes_producao")
      .select("id")
      .eq("maquina_id", maquina_id)
      .eq("plato", plato)
      .eq("status", "em_andamento")
      .limit(1)
      .single();

    if (errExist && errExist.code !== "PGRST116") throw errExist;

    if (existing) {
      return NextResponse.json({ error: "Já possui sessão" }, { status: 409 });
    }

    // Resolve alerta de produção fantasma se houver algum engasgado na máquina
    const { data: alertaPend } = await supabase.from("alertas_maquina")
      .select("id, metadata")
      .eq("maquina_id", maquina_id)
      .eq("tipo", "producao_fantasma")
      .eq("resolvido", false)
      .limit(1)
      .maybeSingle();

    let inicio_sessao = new Date();

    if (alertaPend) {
      // É Produção Fantasma! Recuperamos o TS original do MariaDB
      const mariadbTsStr = alertaPend.metadata?.timestamp_mariadb;
      if (mariadbTsStr) {
        inicio_sessao = new Date(mariadbTsStr);
      }

      // Agora retroagiremos pelo Tempo Padrão do Ciclo para abraçar o pulso órfão inteiro
      const { data: prodData } = await supabase
        .from("vw_produtos_datasul")
        .select("tempo_ciclo_ideal_segundos")
        .eq("codigo_item", produto_codigo)
        .limit(1)
        .maybeSingle();

      const cicloPadrão = prodData?.tempo_ciclo_ideal_segundos || 300; // Padrão 5 min
      inicio_sessao.setSeconds(inicio_sessao.getSeconds() - cicloPadrão);

      // Marca o alerta como resolvido
      await supabase.from("alertas_maquina")
        .update({ resolvido: true, updated_at: new Date().toISOString() })
        .eq("id", alertaPend.id);
    }

    const { data, error } = await supabase.from("sessoes_producao").insert({
      maquina_id,
      produto_codigo,
      plato,
      operador_matricula,
      status: "em_andamento",
      inicio_sessao: inicio_sessao.toISOString() // Data normal (Agora) ou Retroativa (Atrás)
    }).select().single();

    if (error) throw error;

    // Zero-Gaps: Encerramento de eventual parada órfã ao iniciar nova sessão
    const { data: paradaOrfa } = await supabase
      .from("paradas_maquina")
      .select("id")
      .eq("maquina_id", maquina_id)
      .is("sessao_id", null)
      .is("fim_parada", null)
      .limit(1)
      .maybeSingle();

    if (paradaOrfa) {
      await supabase.from("paradas_maquina")
        .update({
          fim_parada: inicio_sessao.toISOString(),
          justificada: true // Assume setup transitório sistêmico
        })
        .eq("id", paradaOrfa.id);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Finalizar sessão de produção
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { sessao_id } = body;

    if (!sessao_id) {
      return NextResponse.json({ error: "Campo obrigatório" }, { status: 400 });
    }

    const { data: pulsos } = await supabase
      .from("pulsos_producao")
      .select("qtd_pecas")
      .eq("sessao_id", sessao_id);

    const quantidadeTotal = pulsos?.reduce((acc, p) => acc + (p.qtd_pecas || 0), 0) || 0;

    if (quantidadeTotal > 0) {
      // Busca o timestamp do último ciclo (pulso) recebido
      const { data: ultimoPulso } = await supabase
        .from("pulsos_producao")
        .select("timestamp_ciclo")
        .eq("sessao_id", sessao_id)
        .order("timestamp_ciclo", { ascending: false })
        .limit(1)
        .single();

      // fim_sessao = timestamp do último ciclo, não a hora do clique do operador
      const fimSessao = ultimoPulso?.timestamp_ciclo
        ? new Date(ultimoPulso.timestamp_ciclo).toISOString()
        : new Date().toISOString();

      const { data, error } = await supabase
        .from("sessoes_producao")
        .update({
          status: "finalizado",
          fim_sessao: fimSessao,
          qtd_produzida: quantidadeTotal,
        })
        .eq("id", sessao_id)
        .select("*")
        .single();

      if (error) throw error;

      // Zero-Gaps: Verifica se era a última sessão em andamento na máquina
      if (data?.maquina_id) {
        const { data: activeSessoes } = await supabase
          .from("sessoes_producao")
          .select("id")
          .eq("maquina_id", data.maquina_id)
          .eq("status", "em_andamento")
          .limit(1);

        if (!activeSessoes || activeSessoes.length === 0) {
          // Parada órfã inicia 1 segundo após o último ciclo (sem gap, sem sobreposição)
          const inicioParada = new Date(new Date(fimSessao).getTime() + 1000).toISOString();
          const { error: insErr } = await supabase.from("paradas_maquina").insert({
            maquina_id: data.maquina_id,
            sessao_id: null,
            inicio_parada: inicioParada,
            motivo_id: "00",
            justificada: false,
          });
          if (insErr) console.error("[API] Falha ao criar parada órfã (Lacuna OEE):", insErr);
        }
      }

      await supabase.from("export_datasul").insert({
        sessao_id,
        item_codigo: (data as any)?.produto_codigo || null,
        operador_matricula: (data as any)?.operador_matricula || null,
        quantidade_total: quantidadeTotal,
        status_importacao: "pendente",
      });

      return NextResponse.json({ data }, { status: 200 });
    } else {
      console.log(`[API] Sessão sem peças produzidas (${sessao_id}). Excluindo rastro...`);
      // Lógica de Cancelamento Limpo: Exclui filhas e a própria sessão Vazia
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { db: { schema: "apont_rubber_prensa" } }
      );

      const { data: sessaoDel } = await supabaseAdmin.from("sessoes_producao").select("maquina_id").eq("id", sessao_id).single();

      await supabaseAdmin.from("paradas_maquina").delete().eq("sessao_id", sessao_id);
      await supabaseAdmin.from("pulsos_producao").delete().eq("sessao_id", sessao_id);
      const { error: delError } = await supabaseAdmin.from("sessoes_producao").delete().eq("id", sessao_id);
      
      if (delError) throw delError;

      // Zero-Gaps: Verifica se exclusão deixou a máquina vazia (Sem sessão rolando)
      if (sessaoDel?.maquina_id) {
        const { data: activeSessoes } = await supabase
          .from("sessoes_producao")
          .select("id")
          .eq("maquina_id", sessaoDel.maquina_id)
          .eq("status", "em_andamento")
          .limit(1);

        if (!activeSessoes || activeSessoes.length === 0) {
          // Evita duplicação caso já exista uma parada vazia
          const { data: existingOrphan } = await supabase.from("paradas_maquina").select("id").eq("maquina_id", sessaoDel.maquina_id).is("sessao_id", null).is("fim_parada", null).limit(1);
          if (!existingOrphan || existingOrphan.length === 0) {
            const { error: insErr } = await supabase.from("paradas_maquina").insert({
              maquina_id: sessaoDel.maquina_id,
              sessao_id: null,
              inicio_parada: new Date().toISOString(),
              motivo_id: "00",
              justificada: false,
            });
            if (insErr) console.error("[API] Falha ao criar parada órfã em cancelamento limpo:", insErr);
          }
        }
      }
      
      return NextResponse.json({ data: { deleted: true, reason: 'zero_production' } }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
