const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'apont_rubber_prensa' } });

async function run() {
  try {
    const { data: todosPulsos } = await supabase.from('pulsos_producao').select('*').in('mariadb_id', ['158_p1', '158_p2', '159_p1', '159_p2']);
    console.log("Pulsos 158/159 no DB:", todosPulsos);
    
    // Check if there's any pulse recently
    const { data: recents } = await supabase.from('pulsos_producao').select('*').order('created_at', { ascending: false }).limit(3);
    console.log("Ultimos 3 pulsos inseridos (Global):", recents);
    
    // Check if MariaDB id 160 exists?
    const { data: syncState } = await supabase.from('sync_state').select('*');
    console.log("Sync state raw:", syncState);

  } catch(e) { console.error(e); }
}
run();
