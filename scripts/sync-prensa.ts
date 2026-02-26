import mysql from "mysql2/promise";
import { createClient } from "@supabase/supabase-js";

// --- Configuração via variáveis de ambiente ---
const MARIADB_URL = process.env.MARIADB_APONTAMENTOS_URL || "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 10_000;

// Cliente Supabase com service_role (sem RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: "apont_rubber_prensa" },
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Busca o último ID do MariaDB já sincronizado
 */
async function getLastSyncedId(): Promise<number> {
  const { data, error } = await supabase
    .from("sync_state")
    .select("ultimo_mariadb_id")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[SYNC] Erro ao ler sync_state, usando ID 0:", error.message);
    return 0;
  }
  return data?.ultimo_mariadb_id ?? 0;
}

/**
 * Atualiza o último ID sincronizado
 */
async function setLastSyncedId(id: number): Promise<void> {
  const { error } = await supabase
    .from("sync_state")
    .update({ ultimo_mariadb_id: id, ultima_sincronizacao: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    console.error("[SYNC] Erro ao atualizar sync_state:", error.message);
  }
}

/**
 * Busca TODAS as sessões ativas para a máquina (uma por plato)
 */
async function getSessoesAtivas(numMaq: string): Promise<{ id: string; produto_codigo: string; plato: number }[]> {
  const { data: maquina } = await supabase
    .from("maquinas")
    .select("id")
    .eq("num_maq", numMaq)
    .single();

  if (!maquina) return [];

  const { data: sessoes } = await supabase
    .from("sessoes_producao")
    .select("id, produto_codigo, plato")
    .eq("maquina_id", maquina.id)
    .eq("status", "em_andamento");

  return sessoes || [];
}

/**
 * Busca o tempo de ciclo ideal do produto
 */
async function getTempoCicloIdeal(produtoCodigo: string): Promise<number> {
  const { data } = await supabase
    .from("vw_produtos_datasul")
    .select("tempo_ciclo_ideal_segundos")
    .eq("codigo_item", produtoCodigo)
    .single();

  return data?.tempo_ciclo_ideal_segundos ?? 300; // fallback: 5 min
}

/**
 * Busca cavidades (lote_multipl do Datasul) para o produto
 */
async function getCavidades(produtoCodigo: string): Promise<number> {
  const { data } = await supabase
    .from("vw_produtos_datasul")
    .select("cavidades")
    .eq("codigo_item", produtoCodigo)
    .single();

  return data?.cavidades ?? 1;
}

/**
 * Busca o último timestamp de pulso de uma sessão
 */
async function getUltimoPulsoTimestamp(sessaoId: string): Promise<Date | null> {
  const { data } = await supabase
    .from("pulsos_producao")
    .select("timestamp_ciclo")
    .eq("sessao_id", sessaoId)
    .order("timestamp_ciclo", { ascending: false })
    .limit(1)
    .single();

  return data ? new Date(data.timestamp_ciclo) : null;
}

/**
 * Cria evento de parada automática
 */
async function criarParada(maquinaNumMaq: string, sessaoId: string, inicioParada: Date): Promise<void> {
  const { data: maquina } = await supabase
    .from("maquinas")
    .select("id")
    .eq("num_maq", maquinaNumMaq)
    .single();

  if (!maquina) return;

  const { error } = await supabase.from("paradas_maquina").insert({
    maquina_id: maquina.id,
    sessao_id: sessaoId,
    inicio_parada: inicioParada.toISOString(),
    classificacao: "nao_planejada",
    justificada: false,
  });

  if (error) {
    console.error("[SYNC] Erro ao criar parada:", error.message);
  } else {
    console.log(`[SYNC] ⚠️ Parada detectada na máquina ${maquinaNumMaq}`);
  }
}

/**
 * Ciclo principal de sincronização
 */
async function syncCycle(): Promise<void> {
  let mariaConnection: mysql.Connection | null = null;

  try {
    const lastId = await getLastSyncedId();

    // Conecta ao MariaDB
    const dbUrl = MARIADB_URL.replace("mariadb://", "mysql://");
    mariaConnection = await mysql.createConnection(dbUrl);

    // Busca novos pulsos
    const [rows] = await mariaConnection.execute<mysql.RowDataPacket[]>(
      "SELECT * FROM prensavulc WHERE id > ? ORDER BY id ASC",
      [lastId]
    );

    if (!rows || rows.length === 0) {
      return; // Nenhum pulso novo
    }

    console.log(`[SYNC] ${rows.length} novo(s) pulso(s) encontrado(s) (a partir do ID ${lastId})`);

    let maxId = lastId;

    for (const row of rows) {
      const numMaq = String(row.num_maq);
      const sessoes = await getSessoesAtivas(numMaq);

      if (sessoes.length === 0) {
        // Sem sessão ativa para esta máquina, apenas registra o ID
        maxId = Math.max(maxId, row.id);
        continue;
      }

      const timestampCiclo = new Date(row.timestamp);

      // Cria pulsos para CADA plato/sessão ativa (1 ciclo CLP = N platos)
      for (const sessao of sessoes) {
        // Calcula intervalo desde o último pulso desta sessão
        const ultimoPulsoTs = await getUltimoPulsoTimestamp(sessao.id);
        let intervaloSegundos: number | null = null;

        if (ultimoPulsoTs) {
          intervaloSegundos = Math.round((timestampCiclo.getTime() - ultimoPulsoTs.getTime()) / 1000);

          // Detecção de parada: intervalo > tempo de ciclo ideal
          const tempoCicloIdeal = await getTempoCicloIdeal(sessao.produto_codigo);
          if (intervaloSegundos > tempoCicloIdeal) {
            await criarParada(numMaq, sessao.id, ultimoPulsoTs);
          }
        }

        // Busca cavidades do Datasul para multiplicar
        const cavidades = await getCavidades(sessao.produto_codigo);

        // Insere o pulso no Supabase (qtd_pecas = 1 ciclo * cavidades)
        // mariadb_id com sufixo do plato para evitar conflito unique
        const pulsoId = `${row.id}_p${sessao.plato}`;
        const { error } = await supabase.from("pulsos_producao").insert({
          sessao_id: sessao.id,
          timestamp_ciclo: timestampCiclo.toISOString(),
          qtd_pecas: cavidades,
          intervalo_segundos: intervaloSegundos,
          mariadb_id: pulsoId,
        });

        if (error) {
          if (!error.message.includes("duplicate") && !error.message.includes("unique")) {
            console.error(`[SYNC] Erro ao inserir pulso ${row.id} plato ${sessao.plato}:`, error.message);
          }
        }
      }

      maxId = Math.max(maxId, row.id);
    }

    // Atualiza o último ID sincronizado
    if (maxId > lastId) {
      await setLastSyncedId(maxId);
      console.log(`[SYNC] ✅ Sincronizado até o ID ${maxId}`);
    }
  } catch (err: any) {
    console.error("[SYNC] ❌ Erro no ciclo de sincronização:", err.message);
  } finally {
    if (mariaConnection) {
      try {
        await mariaConnection.end();
      } catch {
        // Ignora erro ao fechar conexão
      }
    }
  }
}

// --- Inicialização ---
async function main() {
  console.log("===========================================");
  console.log(" Sync Prensa - MariaDB → Supabase");
  console.log(` Intervalo: ${SYNC_INTERVAL_MS / 1000}s`);
  console.log("===========================================");

  // Validação de variáveis
  if (!MARIADB_URL) {
    console.error("[SYNC] MARIADB_APONTAMENTOS_URL não configurada!");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[SYNC] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada!");
    process.exit(1);
  }

  // Loop infinito com intervalo
  while (true) {
    await syncCycle();
    await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL_MS));
  }
}

main();
