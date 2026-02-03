
import { createClient } from "@supabase/supabase-js";

const url = "https://supabase.pcpsuporterei.site";
// Key from .env.local
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const supabase = createClient(url, key);

async function main() {
  try {
    const { data, error } = await supabase
      .rpc('get_policies_for_table', { table_name: 'chat_messages', schema_name: 'app_anotacoes' }); 
      // Note: This RPC might not exist, checking policies usually requires SQL access or querying pg_policies if exposed.
      // Since I don't have direct SQL access, I'll try to just INSERT and SELECT with a fake user to test permissions if I could, 
      // but I can't easily simulate auth user with service key (service key bypasses RLS).
      
    // Plan B: Just try to read with an ANON key (simulating unauthed) or just check if I can 'select' with service role (which always works).
    // Actually, I should check if the table has RLS enabled.
    
    console.log("--- SERVICE ROLE CHECK ---");
    const { data: dataSR, error: errorSR } = await supabase
        .schema('app_anotacoes')
        .from('chat_messages')
        .select('*')
        .limit(1);
    
    if (errorSR) console.log("SR Error:", errorSR.message);
    else console.log("SR Success. Count:", dataSR.length);

    console.log("--- ANON/USER CHECK (Simulation) ---");
    // To simulate a user we need a token, which we don't have easily here without login.
    // unlikely to work without proper setup, but let's check if Table is PUBLIC read?
    
    const anonSupabase = createClient(url, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE");
    const { data: dataAnon, error: errorAnon } = await anonSupabase
        .schema('app_anotacoes')
        .from('chat_messages')
        .select('*')
        .limit(1);

    if (errorAnon) console.log("Anon Error:", errorAnon.message);
    else console.log("Anon Success (Dangerous!). Count:", dataAnon.length);

  } catch (e) {
    console.log(`Script Error: ${e}`);
  }
}

main();
