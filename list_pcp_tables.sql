-- Lista todas as tabelas do schema dashboards_pcp
-- Cole este SQL no Supabase Studio para ver quais tabelas existem

SELECT 
    tablename as "Nome da Tabela"
FROM 
    pg_tables
WHERE 
    schemaname = 'dashboards_pcp'
ORDER BY 
    tablename;
