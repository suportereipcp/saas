const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY, 
  { db: { schema: 'public' } }
);

async function formatAndRun() {
  const sql = `
    GRANT USAGE ON SCHEMA apont_rubber_prensa TO authenticated;
    GRANT USAGE ON SCHEMA apont_rubber_prensa TO anon;
    GRANT ALL ON apont_rubber_prensa.alertas_maquina TO authenticated;
    GRANT ALL ON apont_rubber_prensa.alertas_maquina TO anon;
    GRANT ALL ON apont_rubber_prensa.alertas_maquina TO service_role;
  `;
  
  console.log("Executando permissões...");
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  console.log('Resultado:', data, error);
}

formatAndRun();
