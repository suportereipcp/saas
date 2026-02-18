-- Migration: Create RPC for Saving Calendar (Transactional)
-- Date: 2026-02-18
-- Description: Creates a function to atomically save calendar data, replacing Delete+Insert from client.

CREATE OR REPLACE FUNCTION dashboards_pcp.save_calendar_fatur(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to ensure permissions (or use INVOKER if RLS allows)
SET search_path = public, dashboards_pcp
AS $$
DECLARE
    record jsonb;
BEGIN
    -- 1. Clear the table (Delete all)
    -- Safe to delete all because payload represents the NEW full state
    DELETE FROM dashboards_pcp.calendario_fatur;

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

GRANT EXECUTE ON FUNCTION dashboards_pcp.save_calendar_fatur(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboards_pcp.save_calendar_fatur(jsonb) TO service_role;
