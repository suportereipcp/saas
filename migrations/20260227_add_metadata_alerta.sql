-- Adiciona a coluna para trafegar dados originais do MariaDB (como timestamp) para o App
ALTER TABLE apont_rubber_prensa.alertas_maquina ADD COLUMN IF NOT EXISTS metadata jsonb;
