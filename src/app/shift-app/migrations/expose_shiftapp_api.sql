-- ==============================================================================
-- EXPOSE SHIFTAPP SCHEMA TO SUPABASE API
-- Run this in Supabase SQL Editor after creating the schema
-- ==============================================================================

-- 1. Ensure schema exists and has proper permissions
GRANT USAGE ON SCHEMA shiftapp TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA shiftapp TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA shiftapp TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA shiftapp TO anon, authenticated;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA shiftapp GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA shiftapp GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA shiftapp GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

-- 2. Enable PostgREST API access by adding to the API search path
-- This tells Supabase to include 'shiftapp' in API introspection

-- Run this in the Supabase UI: Settings > API > Custom PostgREST Settings
-- Add 'shiftapp' to the "Extra search paths" field
-- OR run this if you have superuser access:

-- ALTER ROLE authenticator SET search_path = public, shiftapp;

-- 3. Verify foreign keys are properly defined
-- Check with:
-- SELECT 
--   tc.constraint_name, 
--   tc.table_schema, 
--   tc.table_name, 
--   kcu.column_name,
--   ccu.table_schema AS foreign_table_schema,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_schema = 'shiftapp';

-- 4. Refresh Supabase schema cache
-- Go to: Supabase Dashboard > API > Schema > Reload Schema
--   OR
-- NOTIFY pgrst, 'reload schema';
