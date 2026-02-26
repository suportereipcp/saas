import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

async function check() {
  const { data: maquinas, error: errMaquinas } = await supabase.from("maquinas").select("*");
  console.log("MÁQUINAS: ", maquinas, "ERR:", errMaquinas?.message);

  const { data: sessoes, error: errSessoes } = await supabase.from("sessoes_producao").select("*");
  console.log("SESSÕES: ", sessoes, "ERR:", errSessoes?.message);

  const { data: pulsos, error: errPulsos } = await supabase.from("pulsos_producao").select("*").order("timestamp_ciclo", { ascending: false }).limit(5);
  console.log("PULSOS: ", pulsos, "ERR:", errPulsos?.message);
}

check();
