import mysql from "mysql2/promise";
async function test() {
  const c = await mysql.createConnection('mysql://admin:suporterei@mariadb.pcpsuporterei.site:3306/apontamentos');
  const [rows] = await c.execute('SELECT * FROM log_prensas WHERE view_id > 142 ORDER BY view_id ASC LIMIT 20');
  console.log(JSON.stringify(rows, null, 2));
  c.end();
}
test();
