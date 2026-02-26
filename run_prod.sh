#!/bin/sh

echo "[START] Iniciando o Serviço de Sincronização em Background (MariaDB -> Supabase)..."
# Executa o cron num loop infinito de tolerância a falhas em background (&)
(while true; do
  npx tsx scripts/sync-prensa.ts
  echo "[SYNC] Worker crashou. Reiniciando em 5 segundos..."
  sleep 5
done) &

echo "[START] Iniciando o Servidor Web Next.js (Porta 3000)..."
# Executa o servidor principal bloqueando o processo para manter o container vivo
exec node server.js
