-- Migration: Allow Write Access for Calendars (Production and Invoicing)
-- Date: 2026-02-18
-- Description: Fixes RLS violation when saving calendar data by allowing INSERT/UPDATE/DELETE for authenticated users.

-- 1. Calendario Faturamento
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON dashboards_pcp.calendario_fatur;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON dashboards_pcp.calendario_fatur;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON dashboards_pcp.calendario_fatur;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON dashboards_pcp.calendario_fatur;

CREATE POLICY "Enable insert for authenticated users" ON dashboards_pcp.calendario_fatur FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON dashboards_pcp.calendario_fatur FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON dashboards_pcp.calendario_fatur FOR DELETE TO authenticated USING (true);

-- 2. Calendario Producao (Preventive fix)
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON dashboards_pcp.calendario_prod;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON dashboards_pcp.calendario_prod;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON dashboards_pcp.calendario_prod;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON dashboards_pcp.calendario_prod;

CREATE POLICY "Enable insert for authenticated users" ON dashboards_pcp.calendario_prod FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON dashboards_pcp.calendario_prod FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON dashboards_pcp.calendario_prod FOR DELETE TO authenticated USING (true);
