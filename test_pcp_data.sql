-- Test query to check if data is accessible from dashboards_pcp schema
-- Run this in Supabase SQL editor to verify data exists

SELECT 'cards_pedidos' as table_name, COUNT(*) as row_count FROM dashboards_pcp.cards_pedidos
UNION ALL
SELECT 'resumo_por_item', COUNT(*) FROM dashboards_pcp.resumo_por_item
UNION ALL
SELECT 'historico_pedidos', COUNT(*) FROM dashboards_pcp.historico_pedidos
UNION ALL
SELECT 'performance_entrega', COUNT(*) FROM dashboards_pcp.performance_entrega
UNION ALL
SELECT 'estoque_produtos_estrategicos', COUNT(*) FROM dashboards_pcp.estoque_produtos_estrategicos
UNION ALL
SELECT 'pedidos_recebidos', COUNT(*) FROM dashboards_pcp.pedidos_recebidos
UNION ALL
SELECT 'balanceamento_acabado', COUNT(*) FROM dashboards_pcp.balanceamento_acabado
UNION ALL
SELECT 'balanceamento_curva', COUNT(*) FROM dashboards_pcp.balanceamento_curva
UNION ALL
SELECT 'calendario_prod', COUNT(*) FROM dashboards_pcp.calendario_prod
UNION ALL
SELECT 'calendario_fatur', COUNT(*) FROM dashboards_pcp.calendario_fatur;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'dashboards_pcp'
ORDER BY tablename, policyname;
