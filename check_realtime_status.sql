-- Verifica se as tabelas estão na publicação realtime
-- Cole no Supabase Studio para diagnosticar

SELECT 
    schemaname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND schemaname = 'dashboards_pcp'
ORDER BY 
    tablename;
