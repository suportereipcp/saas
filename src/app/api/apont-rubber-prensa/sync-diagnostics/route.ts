import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "apont_rubber_prensa" } }
  );
}

export async function GET() {
  try {
    const supabase = getAdminSupabase();

    // 1. sync_state
    const { data: syncState } = await supabase
      .from("sync_state")
      .select("*")
      .limit(1)
      .single();

    // 2. Últimos 50 pulsos com sessão vinculada
    const { data: pulsos, count: totalPulsos } = await supabase
      .from("pulsos_producao")
      .select("id, sessao_id, timestamp_ciclo, qtd_pecas, mariadb_id, criado_em", { count: "exact" })
      .order("criado_em", { ascending: false })
      .limit(50);

    // 3. Sessões (para lookup)
    const { data: sessoes } = await supabase
      .from("sessoes_producao")
      .select("id, maquina_id, produto_codigo, operador_matricula, plato, status, qtd_produzida, inicio_sessao")
      .order("inicio_sessao", { ascending: false })
      .limit(100);

    // 4. Sessões ativas
    const sessoesAtivas = (sessoes || []).filter(s => s.status === "em_andamento");

    // 5. Exports (para lookup por sessao_id)
    const { data: exports, count: totalExports } = await supabase
      .from("export_datasul")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(200);

    const totalExportsPendentes = (exports || []).filter(e => e.status_importacao === "pendente").length;

    // 6. Alertas fantasma ativos
    const { data: alertasAtivos } = await supabase
      .from("alertas_maquina")
      .select("id, maquina_id, tipo, metadata, created_at")
      .eq("resolvido", false)
      .eq("tipo", "producao_fantasma");

    // 7. Máquinas
    const { data: maquinas } = await supabase
      .from("maquinas")
      .select("id, num_maq, nome");

    // 8. Montar tabela unificada: pulso → sessão → export
    const sessaoMap = new Map((sessoes || []).map(s => [s.id, s]));
    const exportsBySessao = new Map<string, any[]>();
    for (const exp of (exports || [])) {
      if (!exportsBySessao.has(exp.sessao_id)) exportsBySessao.set(exp.sessao_id, []);
      exportsBySessao.get(exp.sessao_id)!.push(exp);
    }

    const tabelaUnificada = (pulsos || []).map(p => {
      const sessao = p.sessao_id ? sessaoMap.get(p.sessao_id) : null;
      const exportsArr = p.sessao_id ? (exportsBySessao.get(p.sessao_id) || []) : [];
      // Busca export mais próximo pelo timestamp
      const exportMatch = exportsArr.find(e => 
        e.item_codigo === sessao?.produto_codigo
      );
      
      return {
        pulso_id: p.mariadb_id,
        pulso_pecas: p.qtd_pecas,
        pulso_timestamp: p.timestamp_ciclo,
        pulso_criado: p.criado_em,
        sessao_id: p.sessao_id,
        sessao_maquina: sessao?.maquina_id || null,
        sessao_produto: sessao?.produto_codigo || null,
        sessao_operador: sessao?.operador_matricula || null,
        sessao_plato: sessao?.plato || null,
        sessao_status: sessao?.status || null,
        sessao_qtd: sessao?.qtd_produzida || 0,
        export_status: exportMatch?.status_importacao || (p.sessao_id ? "pendente" : "sem_sessao"),
        export_updated_at: exportMatch?.updated_at || exportMatch?.created_at || null,
      };
    });

    // Diagnóstico
    const pulsosSemSessao = tabelaUnificada.filter(r => !r.sessao_id).length;
    const sessoesOciosas = 0; // simplificado

    return NextResponse.json({
      syncState,
      totalPulsos,
      sessoesAtivas: sessoesAtivas.length,
      totalExportsPendentes,
      alertasAtivos: alertasAtivos || [],
      maquinas: maquinas || [],
      tabelaUnificada,
      diagnostico: {
        pulsosSemSessao,
        sessoesOciosas,
        alertasFantasmaAtivos: (alertasAtivos || []).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
