-- Migration: Split Calendar into Production and Invoicing
-- Date: 2026-01-29

DO $$
BEGIN
    -- 1. Rename existing 'calendario' to 'calendario_prod' if it exists and target doesn't
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dashboards' AND table_name = 'calendario') THEN
        ALTER TABLE dashboards.calendario RENAME TO calendario_prod;
    END IF;

    -- 2. Create 'calendario_fatur' if it doesn't exist (Clone structure)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dashboards' AND table_name = 'calendario_fatur') THEN
        CREATE TABLE dashboards.calendario_fatur (LIKE dashboards.calendario_prod INCLUDING ALL);
        
        -- Grant permissions (just in case inheriting fails or defaults aren't set)
        GRANT ALL ON dashboards.calendario_fatur TO anon, authenticated, service_role;
    END IF;
    
    -- Ensure permissions on renamed table
    GRANT ALL ON dashboards.calendario_prod TO anon, authenticated, service_role;

END $$;
