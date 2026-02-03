
import { createClient } from "@supabase/supabase-js";

const url = "https://supabase.pcpsuporterei.site";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const supabase = createClient(url, key);

async function main() {
  try {
    console.log("Listing all apps in public.apps...");
    const { data: apps, error } = await supabase
      .from('apps')
      .select('*');

    if (error) {
        console.error("Error fetching apps:", error);
    } else {
        if (apps) {
            console.log("\n--- APPS LIST ---");
            apps.forEach(app => {
                console.log(`\nID: ${app.id}`);
                console.log(`Code: ${app.code}`);
                console.log(`Name: ${app.name}`);
                console.log(`Description: ${app.description}`);
                console.log(`Active: ${app.active}`);
                console.log("-------------------");
            });
        }
    }
  } catch (e) {
    console.log(`Script Error: ${e}`);
  }
}

main();
