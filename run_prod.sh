#!/bin/sh

echo "[START] Iniciando o Serviço de Sincronização em Background (MariaDB -> Supabase)..."
# Executa o cron em background (&). Redireciona logs para console local do docker.
npx tsx scripts/sync-prensa.ts &

echo "[START] Iniciando o Servidor Web Next.js (Porta 3000)..."
# Executa o servidor principal bloqueando o processo para manter o container vivo
exec node server.js
