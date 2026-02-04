-- Create new schema
CREATE SCHEMA IF NOT EXISTS inventario;

-- Move table from public to inventario
ALTER TABLE public.inventario_rotativo SET SCHEMA inventario;

-- Update permissions (Grant usage on schema to generic roles if needed)
GRANT USAGE ON SCHEMA inventario TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA inventario TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA inventario TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA inventario TO postgres, anon, authenticated, service_role;
