import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function check() {
  const dbUrl = process.env.MARIADB_APONTAMENTOS_URL!.replace("mariadb://", "mysql://");
  const conn = await mysql.createConnection(dbUrl);
  
  const [rows] = await conn.execute("SELECT * FROM prensavulc ORDER BY id DESC LIMIT 5");
  console.log("ÚLTIMOS 5 NO MARIADB:", rows);
  
  conn.end();
}
check();
