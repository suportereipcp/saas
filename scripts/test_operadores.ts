import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Teste 1: Consultando operador '1181'");
  let query = "1181";

  // Verifica se é numero
  const isNumber = !isNaN(Number(query));

  const filter = isNumber 
    ? `cdn_funcionario.eq.${query},nom_pessoa_fisic.ilike.%${query}%` 
    : `nom_pessoa_fisic.ilike.%${query}%`;

  const { data, error } = await supabase
    .schema("datasul")
    .from("funcionario")
    .select("cdn_funcionario, nom_pessoa_fisic")
    .or(filter)
    .limit(10);

  if (error) {
    console.error("ERRO:", error);
  } else {
    console.log("RESULTADO:", data);
  }
}

main();
