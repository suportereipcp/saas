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
    .upsert(
      { id: 1, ultimo_mariadb_id: id, ultima_sincronizacao: new Date().toISOString() },
      { onConflict: 'id' }
    );

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
 * Verifica se existe uma parada em aberto para a sessão
 */
async function getParadaAberta(sessaoId: string) {
  const { data } = await supabase
    .from("paradas_maquina")
    .select("id, justificada, motivo_id, inicio_parada")
    .eq("sessao_id", sessaoId)
    .is("fim_parada", null)
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Fecha uma parada em aberto
 */
async function fecharParada(paradaId: string, timestampFim: Date) {
  await supabase
    .from("paradas_maquina")
    .update({ 
      fim_parada: timestampFim.toISOString(),
      // Se fechou sem o operador justificar na tela, marca como "Automática / Expirada" mas na real ele sempre vai ter que justificar na UI.
    })
    .eq("id", paradaId);
}

/**
 * Cria evento de parada (início de parada sem fim definido)
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
    // fim_parada é NULL por default no banco
  });

  if (error) {
    console.error("[SYNC] Erro ao criar parada:", error.message);
  } else {
    console.log(`[SYNC] ⚠️ Status alterado para PARADA na máquina ${maquinaNumMaq} (Iniciada às ${inicioParada.toISOString()})`);
  }
}

/**
 * Pílar A: Ciclo Principal de Sincronização de Dados via MariaDB (Eventos)
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
      return; 
    }

    console.log(`[SYNC] ${rows.length} novo(s) pulso(s) encontrado(s) (a partir do ID ${lastId})`);
    let maxId = lastId;

    for (const row of rows) {
      const numMaq = String(row.num_maq);
      const sessoes = await getSessoesAtivas(numMaq);

      if (sessoes.length === 0) {
        // Sem sessão ativa para esta máquina, ignora contagem mas avança o LSN
        // E dispara alerta de produção fantasma se não houver um ativo
        try {
          const { data: maquina } = await supabase.from("maquinas").select("id").eq("num_maq", numMaq).single();
          if (maquina) {
            const { data: alertas } = await supabase
              .from("alertas_maquina")
              .select("id")
              .eq("maquina_id", maquina.id)
              .eq("tipo", "producao_fantasma")
              .eq("resolvido", false)
              .limit(1);

            // Ajuste de Fuso Horário: MariaDB retorna a hora local, mas o driver mysql2 
            // entende como UTC. Adicionamos +3h para converter corretamente para UTC real.
            const timestampCiclo = new Date(row.timestamp);
            timestampCiclo.setHours(timestampCiclo.getHours() + 3);

            if (!alertas || alertas.length === 0) {
              await supabase.from("alertas_maquina").insert({
                maquina_id: maquina.id,
                tipo: "producao_fantasma",
                resolvido: false,
                metadata: { timestamp_mariadb: timestampCiclo.toISOString() }
              });
              console.log(`[SYNC] 👻 ALERTA: Produção fantasma detectada na máquina ${numMaq}! (PULSO ORIGINAL EM: ${timestampCiclo.toISOString()})`);
            }
          }
        } catch (e) {
          console.error("[SYNC] Erro ao processar produção fantasma:", e);
        }

        maxId = Math.max(maxId, row.id);
        continue;
      }

      // Ajuste de Fuso Horário: MariaDB retorna a hora local, mas o driver mysql2 
      // entende como UTC. Adicionamos +3h para converter corretamente para UTC real.
      const timestampCiclo = new Date(row.timestamp);
      timestampCiclo.setHours(timestampCiclo.getHours() + 3);
      
      for (const sessao of sessoes) {
        const ultimoPulsoTs = await getUltimoPulsoTimestamp(sessao.id);
        let intervaloSegundos: number | null = null;

        if (ultimoPulsoTs) {
          intervaloSegundos = Math.round((timestampCiclo.getTime() - ultimoPulsoTs.getTime()) / 1000);
        }

        // --- CÓDIGO NOVO: Fecha Paradas Abertas ---
        // Se a máquina bateu pulso, significa que ela VOLTOU a operar.
        const paradaAberta = await getParadaAberta(sessao.id);
        if (paradaAberta) {
          await fecharParada(paradaAberta.id, timestampCiclo);
          console.log(`[SYNC] ✅ Parada fechada para máquina ${numMaq}, plato ${sessao.plato} (Voltou a produzir)`);
        }

        // Busca cavidades
        const cavidades = await getCavidades(sessao.produto_codigo);

        // Insere o pulso
        const pulsoId = `${row.id}_p${sessao.plato}`;
        const { error } = await supabase.from("pulsos_producao").insert({
          sessao_id: sessao.id,
          timestamp_ciclo: timestampCiclo.toISOString(),
          qtd_pecas: cavidades,
          intervalo_segundos: intervaloSegundos,
          mariadb_id: pulsoId,
        });

        if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
          console.error(`[SYNC] Erro ao inserir pulso ${row.id} plato ${sessao.plato}:`, error.message);
        }
      }

      maxId = Math.max(maxId, row.id);
    }

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
        // Ignora erro
      }
    }
  }
}

/**
 * Pilar B: Watchdog (Processo Contínuo de Monitoramento de Paradas por Atraso)
 */
async function watchdogCycle(): Promise<void> {
  try {
    // Busca todas as sessões "Em Andamento" de todas as máquinas
    const { data: sessoesGlobais } = await supabase
      .from("sessoes_producao")
      .select("id, produto_codigo, plato, maquina_id, inicio_sessao")
      .eq("status", "em_andamento");

    if (!sessoesGlobais || sessoesGlobais.length === 0) return;

    // Cache simples de IDs de máquinas para NumMaq
    const { data: maquinas } = await supabase.from("maquinas").select("id, num_maq");
    const maqMap = new Map();
    (maquinas || []).forEach(m => maqMap.set(m.id, m.num_maq));

    // Agrupar sessoes por maquina
    const sessoesPorMaquina = new Map<string, any[]>();
    for (const s of sessoesGlobais) {
      const arr = sessoesPorMaquina.get(s.maquina_id) || [];
      arr.push(s);
      sessoesPorMaquina.set(s.maquina_id, arr);
    }

    for (const [maquinaId, sessoes] of sessoesPorMaquina.entries()) {
      const numMaq = maqMap.get(maquinaId) || "unknown";

      // 1. Calcula a média do tempo de ciclo da MÁQUINA
      let somaCiclo = 0;
      for (const s of sessoes) {
         somaCiclo += await getTempoCicloIdeal(s.produto_codigo);
      }
      const mediaCicloIdeal = somaCiclo / sessoes.length;

      // 2. Calcula o tempo da última atividade da MÁQUINA (maior startRef entre as sessões ativas)
      let maquinaStartRefT = 0;
      for (const s of sessoes) {
         const ultimoPulsoTs = await getUltimoPulsoTimestamp(s.id);
         const sRef = ultimoPulsoTs ? ultimoPulsoTs.getTime() : new Date(s.inicio_sessao).getTime();
         if (sRef > maquinaStartRefT) maquinaStartRefT = sRef;
      }
      const maquinaStartRef = new Date(maquinaStartRefT);

      const segundosOcioso = Math.round((Date.now() - maquinaStartRef.getTime()) / 1000);
      
      // REGRA DE NEGÓCIO DA MÁQUINA: Alerta em 1.6x da Média do Ciclo, Encerra após Alerta + 5 minutos.
      const limiteParada = mediaCicloIdeal * 1.6;
      const limiteAbandono = limiteParada + (5 * 60); // 300 segundos = 5 minutos

      // CASO 1: TEMPO EXCEDE LIMITE DE ABANDONO TOTAL (Auto-Encerramento de TODA a Máquina)
      if (segundosOcioso > limiteAbandono) {
        for (const sessao of sessoes) {
          const paradaAberta = await getParadaAberta(sessao.id);
          // Se tinha parada na tela pedindo motivo, fecha assumindo motivo Branco (null)
          if (paradaAberta && !paradaAberta.justificada) {
            await supabase
              .from("paradas_maquina")
              .update({ 
                 fim_parada: new Date().toISOString(), 
                 motivo_id: null, 
                 justificada: true 
              })
              .eq("id", paradaAberta.id);
          }
          
          // Finaliza a Sessão de Produção forçadamente
          await supabase
            .from("sessoes_producao")
            .update({ 
              status: "finalizada", 
              fim_sessao: new Date().toISOString(), 
              total_refugo: 0 
            })
            .eq("id", sessao.id);
        }
        console.log(`[WATCHDOG] 🛑 Máquina ${numMaq} abandonada (>${Math.round(limiteAbandono)}s). Sessões finalizadas.`);
        continue;
      }

      // CASO 2: TEMPO EXCEDE LIMITE DE PARADA (Criar Alerta de Justificativa na Máquina)
      if (segundosOcioso > limiteParada) {
        for (const sessao of sessoes) {
          const paradaAberta = await getParadaAberta(sessao.id);
          // Se não houver uma parada já aberta pedindo justificativa para essa sessão, crie!
          if (!paradaAberta) {
            await criarParada(numMaq, sessao.id, maquinaStartRef);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[WATCHDOG] ❌ Erro no watchdog:", err.message);
  }
}

// --- Inicialização ---
async function main() {
  console.log("===========================================");
  console.log(" Sync Prensa - MariaDB → Supabase");
  console.log(` Intervalo: ${SYNC_INTERVAL_MS / 1000}s`);
  console.log("===========================================");

  if (!MARIADB_URL) {
    console.error("[SYNC] MARIADB_APONTAMENTOS_URL não configurada!");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[SYNC] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada!");
    process.exit(1);
  }

  while (true) {
    await syncCycle();
    await watchdogCycle(); // Novo: Detecta atrasos cruciais instantaneamente
    await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL_MS));
  }
}

main();
