async function run() {
  const res = await fetch("http://localhost:3000/api/auth/testDB");
  const txt = await res.text();
  console.log(txt);
}
run();
