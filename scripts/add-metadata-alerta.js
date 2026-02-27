const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY, 
  { db: { schema: 'public' } }
);

async function formatAndRun() {
  const sql = `
    -- Adiciona a coluna JSONB para carregar informações flexíveis (ex: timestamp original do pulso)
    ALTER TABLE apont_rubber_prensa.alertas_maquina ADD COLUMN IF NOT EXISTS metadata jsonb;
  `;
  
  console.log("Executando alter table...");
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  console.log('Resultado:', data, error);
}

formatAndRun();
