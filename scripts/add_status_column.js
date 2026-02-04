const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  await client.connect();
  try {
    console.log("Adding 'status' column to inventario.inventario_rotativo...");
    await client.query(`
      ALTER TABLE inventario.inventario_rotativo 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente';
    `);
    console.log("Column added successfully or already exists.");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

run();
