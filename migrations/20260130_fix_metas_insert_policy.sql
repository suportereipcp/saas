-- Allow INSERT on metas table for dashboards_pcp
-- Fixes "Erro ao salvar" in Metas page

ALTER TABLE IF EXISTS dashboards_pcp.metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_insert_metas ON dashboards_pcp.metas;
CREATE POLICY allow_insert_metas ON dashboards_pcp.metas FOR INSERT WITH CHECK (true);

-- Ensure permissions are granted
GRANT INSERT ON dashboards_pcp.metas TO authenticated, anon;
GRANT UPDATE ON dashboards_pcp.metas TO authenticated, anon; -- In case we switch to UPDATE later
