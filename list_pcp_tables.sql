-- Listar todas as tabelas que realmente existem no schema dashboards_pcp
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'dashboards_pcp'
ORDER BY table_name;
