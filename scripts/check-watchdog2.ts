import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { db: { schema: 'apont_rubber_prensa' } });

// Copiando funcões necessárias
async function getUltimoPulsoTimestamp(sessaoId: string): Promise<Date | null> {
  const { data } = await supabase.from("pulsos_producao").select("timestamp_ciclo").eq("sessao_id", sessaoId).order("timestamp_ciclo", { ascending: false }).limit(1).single();
  return data ? new Date(data.timestamp_ciclo) : null;
}

async function getParadaAberta(sessaoId: string) {
  const { data } = await supabase.from("paradas_maquina").select("id, justificada, motivo_id, created_at").eq("sessao_id", sessaoId).is("fim_parada", null).limit(1).maybeSingle();
  return data;
}

async function getTempoCicloIdeal(produtoCodigo: string): Promise<number> {
  const { data } = await supabase.from("vw_produtos_datasul").select("tempo_ciclo_ideal_segundos").eq("codigo_item", produtoCodigo).single();
  return data?.tempo_ciclo_ideal_segundos ?? 300;
}

async function run() {
  const { data: sessoesGlobais } = await supabase.from("sessoes_producao").select("id, produto_codigo, plato, maquina_id, iniciado_em").eq("status", "em_andamento");
  
  if (!sessoesGlobais || sessoesGlobais.length === 0) { console.log("Sem sessoes ativas"); return; }
  
  for (const sessao of sessoesGlobais) {
    console.log(`\n--- Testando Sessão ID: ${sessao.id} (${sessao.produto_codigo}) ---`);
    const paradaAberta = await getParadaAberta(sessao.id);
    if (paradaAberta) {
      console.log("Parada Aberta encontrada:", paradaAberta);
      continue;
    }

    const ultimoPulsoTs = await getUltimoPulsoTimestamp(sessao.id);
    const startRef = ultimoPulsoTs || new Date(sessao.iniciado_em);
    
    console.log("ultimoPulsoTs:", ultimoPulsoTs?.toISOString());
    console.log("iniciado_em:", new Date(sessao.iniciado_em).toISOString());
    console.log("startRef final:", startRef.toISOString());
    
    const agora = new Date();
    console.log("Agora (sistema loc):", agora.toISOString());
    
    const segundosOcioso = Math.round((Date.now() - startRef.getTime()) / 1000);
    const tempoCicloIdeal = await getTempoCicloIdeal(sessao.produto_codigo);
    const limiteSegundos = tempoCicloIdeal * 1.6;
    
    console.log(`Segundos Ocioso: ${segundosOcioso}s | Limite de Estouro: ${limiteSegundos}s`);
    
    if (segundosOcioso > limiteSegundos) {
      console.log(`!!! DEVIA TER CRIADO PARADA !!! Ociosidade de ${segundosOcioso} é maior que lim. ${limiteSegundos}`);
    } else {
      console.log("Tudo sob normalidade.");
    }
  }
}
run();
