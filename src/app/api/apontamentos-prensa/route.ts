import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export async function GET() {
  try {
    const mysqlUri = process.env.MARIADB_APONTAMENTOS_URL || "";

    if (!mysqlUri) {
      throw new Error("MARIADB_APONTAMENTOS_URL não está configurada no .env.local");
    }

    // Utilizamos o parsing de string manual conectando de fora (Dev/VSCode) e prevemos a interna (Prod)
    // O Timeout ocorre geralmente quando a porta 3307 do easypanel não está liberada no firewall externo
    
    // Tratativa para driver Node aceitar SSL inseguro (se houver proxy no easypanel) e converter scheme
    const dbUrl = mysqlUri.replace("mariadb://", "mysql://");
    
    const connection = await mysql.createConnection(dbUrl);

    // Consulta à tabela prensavulc ordenando do mais recente para o mais antigo
    const [rows] = await connection.execute(
      "SELECT * FROM prensavulc ORDER BY timestamp DESC LIMIT 50"
    );

    await connection.end();

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao conectar no MariaDB:", error);
    return NextResponse.json(
      { error: "Falha na conexão com o banco de dados", details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
