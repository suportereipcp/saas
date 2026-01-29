-- Migration: Fix RLS and Permissions for Dashboards PCP
-- Date: 2026-01-29

-- 0. Ensure Schema Name is Correct (Rename 'dashboards' -> 'dashboards_pcp' if exists)
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dashboards') THEN
        ALTER SCHEMA dashboards RENAME TO dashboards_pcp;
    END IF;
END
$$;

-- 1. Grant Usage on Schema (Redundant but safe)
GRANT USAGE ON SCHEMA dashboards_pcp TO anon, authenticated, service_role;

-- 2. Grant Select on All Tables
GRANT SELECT ON ALL TABLES IN SCHEMA dashboards_pcp TO anon, authenticated, service_role;

-- 3. Ensure RLS is handled. 
-- Option A: Disable RLS (Best for simple read-only dashboards populated by system/webhook)
ALTER TABLE dashboards_pcp.cards_pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.resumo_por_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.historico_pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.performance_entrega DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.estoque_produtos_estrategicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.pedidos_recebidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.balanceamento_estoque_acabado DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.balanceamento_curva DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.estoque_fundicao DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.media_prensa_injetora DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.acompanhamento_diario DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.carteira_me DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.carteira_mi DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.faturamento_diario DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.vendas_diaria DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.calendario_prod DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.calendario_fatur DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards_pcp.metas DISABLE ROW LEVEL SECURITY;

-- 4. Just in case RLS is mistakenly enabled on any, keep it disabled for now to rule out policy issues.
