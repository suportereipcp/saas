
-- Run this script in your Supabase SQL Editor to list all custom tables and schemas
-- This helps identify if the schema is named 'datasul' or something else, 
-- or if the table name is slightly different (e.g. 'tabela_item', 'Item', etc).

SELECT 
    table_schema as schema, 
    table_name as table 
FROM 
    information_schema.tables 
WHERE 
    table_schema NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'vault', 'supabase_functions', 'graphql', 'graphql_public', 'realtime')
ORDER BY 
    table_schema, table_name;
