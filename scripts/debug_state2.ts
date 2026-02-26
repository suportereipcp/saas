import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

async function check() {
  const { data: estado } = await supabase.from("sync_state").select("*").eq("id", 1).single();
  console.log("-> SYNC STATE ATUAL:", estado);

  const { data: pulsos } = await supabase.from("pulsos_producao").select("mariadb_id, sessao_id").order("criado_em", { ascending: false }).limit(10);
  console.log("-> ÚLTIMOS 10 PULSOS:", pulsos);

  // Check webhook_logs to see if anything was saved there
  const { data: webhooks } = await supabase.from("webhook_logs").select("*").order("created_at", { ascending: false }).limit(5);
  console.log("-> ÚLTIMOS WEBHOOKS:", webhooks);
}

check();
