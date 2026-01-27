
import { createClient } from "@supabase/supabase-js";

const url = "https://supabase.pcpsuporterei.site";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const supabase = createClient(url, key);

async function main() {
  try {
    console.log("Checking public.apps table...");
    const { data: apps, error } = await supabase
      .from('apps')
      .select('*')
      .eq('code', 'app_anotacoes');

    if (error) {
        console.error("Error fetching apps:", error);
    } else {
        if (apps && apps.length > 0) {
            console.log("SUCCESS: App found!", apps[0]);
        } else {
            console.log("FAILURE: App 'app_anotacoes' NOT found.");
        }
    }
  } catch (e) {
    console.log(`Script Error: ${e}`);
  }
}

main();
