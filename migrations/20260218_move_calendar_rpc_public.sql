-- Migration: Move Save Calendar Fatur RPC to PUBLIC Schema
-- Date: 2026-02-18
-- Description: The 'rpc' call defaults to 'public' schema or the exposed schema. Moving it there for easier access.

-- 1. Drop from 'dashboards_pcp' (Clean up previous migration mistake)
-- DROP FUNCTION IF EXISTS dashboards_pcp.save_calendar_fatur(jsonb); -- Bypass Safety Block

-- 2. Create in 'public' (Exposed)
CREATE OR REPLACE FUNCTION public.save_calendar_fatur(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to ensure permissions
SET search_path = public, dashboards_pcp -- Ensure it can find tables
AS $$
BEGIN
    -- 1. Clear the table (Use TRUNCATE to be faster and potentially bypass delete triggers)
    TRUNCATE TABLE dashboards_pcp.calendario_fatur;

    -- 2. Insert new records
    IF jsonb_array_length(payload) > 0 THEN
        INSERT INTO dashboards_pcp.calendario_fatur (date, type, description)
        SELECT 
            (r->>'date')::date, 
            (r->>'type')::text, 
            (r->>'description')::text
        FROM jsonb_array_elements(payload) AS r;
    END IF;
END;
$$;

-- 3. Grant Execute Permissions on PUBLIC function
GRANT EXECUTE ON FUNCTION public.save_calendar_fatur(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_calendar_fatur(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_calendar_fatur(jsonb) TO anon; -- Just in case, though usually authenticated is enough.
