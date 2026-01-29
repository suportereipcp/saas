-- Grant usage on the new schema
GRANT USAGE ON SCHEMA dashboards_pcp TO anon, authenticated, service_role;

-- Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA dashboards_pcp TO anon, authenticated, service_role;

-- Grant access to all sequences (for ID generation)
GRANT ALL ON ALL SEQUENCES IN SCHEMA dashboards_pcp TO anon, authenticated, service_role;

-- Ensure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboards_pcp GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboards_pcp GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
