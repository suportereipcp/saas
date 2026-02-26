import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const MARIADB_URL = process.env.MARIADB_APONTAMENTOS_URL || "";

async function checkMaria() {
  const dbUrl = MARIADB_URL.replace("mariadb://", "mysql://");
  const mariaConnection = await mysql.createConnection(dbUrl);

  const [rows] = await mariaConnection.execute<mysql.RowDataPacket[]>(
    "SELECT * FROM prensavulc WHERE id > ? ORDER BY id ASC LIMIT 10",
    [142]
  );
  
  mariaConnection.end();

  console.log("Linhas na MariaDB após o ID 142:");
  console.log(JSON.stringify(rows, null, 2));
}

checkMaria();
