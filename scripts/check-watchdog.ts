import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { db: { schema: 'apont_rubber_prensa' } });

async function run() {
  console.log("=== CHECK WATCHDOG STATE ===");
  const { data: sessoes } = await supabase.from('sessoes_producao').select('*').eq('status', 'em_andamento');
  console.log("Sessoes em Andamento:", sessoes);

  const { data: paradas } = await supabase.from('paradas_maquina').select('*').is('fim_parada', null);
  console.log("Paradas Abertas (Fim Null):", paradas);

  if (sessoes && sessoes.length > 0) {
    for (const sessao of sessoes) {
      const { data: pulsos } = await supabase.from('pulsos_producao').select('*').eq('sessao_id', sessao.id).order('timestamp_ciclo', { ascending: false }).limit(1);
      console.log(`Ultimo pulso Sessao ${sessao.id}:`, pulsos);
      
      const { data: prod } = await supabase.from('vw_produtos_datasul').select('tempo_ciclo_ideal_segundos').eq('codigo_item', sessao.produto_codigo).single();
      console.log(`Tempo ideal para ${sessao.produto_codigo}:`, prod?.tempo_ciclo_ideal_segundos);
    }
  }
}
run();
