-- Enable Realtime for all dashboards_pcp tables
--
-- This migration configures all tables in the dashboards_pcp schema
-- to support Supabase Realtime by:
-- 1. Setting REPLICA IDENTITY to FULL (required for real-time updates)
-- 2. Adding tables to the supabase_realtime publication

-- Set REPLICA IDENTITY FULL for all tables
ALTER TABLE dashboards_pcp.cards_pedidos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.historico_pedidos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.performance_entrega REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.estoque_produtos_estrategicos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.qtd_pedidos_recebidos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.balanceamento_estoque_acabado REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.balanceamento_estoque_curva REPLICA IDENTITY FULL;

ALTER TABLE dashboards_pcp.estoque_fundicao REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.media_prensa_injetora REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.calendario_prod REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.faturamento_diario REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.vendas_diaria REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.acompanhamento_diario REPLICA IDENTITY FULL;

ALTER TABLE dashboards_pcp.carteira_mi REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.carteira_me REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.calendario_fatur REPLICA IDENTITY FULL;

ALTER TABLE dashboards_pcp.metas REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.config REPLICA IDENTITY FULL;

-- Add all tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.cards_pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.historico_pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.performance_entrega;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.estoque_produtos_estrategicos;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.qtd_pedidos_recebidos;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.balanceamento_estoque_acabado;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.balanceamento_estoque_curva;

ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.estoque_fundicao;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.media_prensa_injetora;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.calendario_prod;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.faturamento_diario;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.vendas_diaria;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.acompanhamento_diario;

ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.carteira_mi;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.carteira_me;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.calendario_fatur;

ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.metas;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.config;

-- Grant necessary permissions for realtime
GRANT SELECT ON ALL TABLES IN SCHEMA dashboards_pcp TO anon, authenticated;

COMMENT ON SCHEMA dashboards_pcp IS 'Realtime enabled for all dashboard tables';
