import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Simulando inserção na sessoes_producao...");
  try {
    const maquina_id = "55a1df47-0639-44ef-ae3e-56e2978dcd80"; // vou colocar uma maquina qualquer
    const { data: mData } = await supabase.schema("apont_rubber_prensa").from("maquinas").select("id").limit(1).single();
    
    if(!mData) {
      console.log("Nenhuma maquina encontrada!");
      return;
    }

    const { data, error } = await supabase.schema("apont_rubber_prensa").from("sessoes_producao").insert({
      maquina_id: mData.id,
      produto_codigo: "R-025/PRENSADO",
      plato: 1,
      operador_matricula: "1181",
      status: "em_andamento",
    }).select().single();

    if (error) {
      console.error("ERRO COMPLETO DO BANCO:", JSON.stringify(error, null, 2));
    } else {
      console.log("Sucesso, inseriu:", data);
      
      // Cleanup
      await supabase.schema("apont_rubber_prensa").from("sessoes_producao").delete().eq("id", data.id);
    }
  } catch (err: any) {
    console.error("Crash do script:", err);
  }
}

main();
