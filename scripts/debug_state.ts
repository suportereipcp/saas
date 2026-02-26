import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

async function check() {
  const { data: state, error: errState } = await supabase.from("sync_state").select("*").single();
  console.log("SYNC_STATE: ", state, "ERR:", errState?.message);

  const { data: pulsos, error: errPulsos } = await supabase.from("pulsos_producao").select("id, mariadb_id, timestamp_ciclo, qtd_pecas", { count: "exact" }).order("mariadb_id", { ascending: false }).limit(5);
  console.log("ÚLTIMOS PULSOS: ", pulsos, "ERR:", errPulsos?.message);
}

check();
