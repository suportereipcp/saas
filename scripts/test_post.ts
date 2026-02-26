async function main() {
  const res = await fetch("http://localhost:3000/api/apont-rubber-prensa/sessoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      maquina_id: "55a1df47-0639-44ef-ae3e-56e2978dcd80", // ID Fixo qualquer apenas pra testar se o banco rejeita
      produto_codigo: "R-025/PRENSADO",
      plato: 1,
      operador_matricula: "1181"
    })
  });
  
  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("RESPOSTA:", text);
}

main();
