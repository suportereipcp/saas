import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://supabase.pcpsuporterei.site";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: "apont_rubber_prensa" }
});

async function main() {
  console.log("Selecionando máquina...");
  const { data: mData, error: mErr } = await supabase.from("maquinas").select("id").limit(1).single();
  if (mErr) {
    console.error("Erro máquina:", mErr);
    return;
  }

  console.log("Inserindo sessão...");
  const { data, error } = await supabase.from("sessoes_producao").insert({
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
    await supabase.from("sessoes_producao").delete().eq("id", data.id);
  }
}

main();
