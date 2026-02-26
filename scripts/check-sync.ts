import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'apont_rubber_prensa' } });

async function run() {
  try {
    console.log("Checando Sync State...");
    const { data: syncState } = await supabase.from('sync_state').select('*');
    console.log("Sync State:", syncState);

    console.log("Checando Máquina 2...");
    const { data: maq } = await supabase.from('maquinas').select('id, num_maq').eq('num_maq', '2').single();
    if (!maq) {
      console.log("Máquina 2 não encontrada!");
      return;
    }
    console.log("Máquina:", maq);

    console.log("Checando Sessões Ativas Máquina 2...");
    const { data: sessoes, error: errS } = await supabase.from('sessoes_producao').select('*').eq('maquina_id', maq.id);
    console.log("Sessoes:", sessoes, errS);

    if (sessoes && sessoes.length > 0) {
      for (const s of sessoes) {
        const { data: pulsos } = await supabase.from('pulsos_producao').select('*').eq('sessao_id', s.id).order('timestamp_ciclo', { ascending: false }).limit(3);
        console.log(`Pulsos Sessão ${s.id} (Plato ${s.plato}):`, pulsos);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
