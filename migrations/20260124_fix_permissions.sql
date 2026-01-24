-- Grant permissions for schema app_anotacoes

-- 1. Grant USAGE on schema to standard Supabase roles
GRANT USAGE ON SCHEMA app_anotacoes TO anon, authenticated, service_role;

-- 2. Grant ALL privileges on all tables in schema to standard Supabase roles
GRANT ALL ON ALL TABLES IN SCHEMA app_anotacoes TO anon, authenticated, service_role;

-- 3. Ensure future tables also inherit these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA app_anotacoes GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 4. Specifically for sequences (if using serial IDs, though we use UUIDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_anotacoes TO anon, authenticated, service_role;
