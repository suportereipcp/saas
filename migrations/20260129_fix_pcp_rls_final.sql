-- Aplicar políticas RLS para TODAS as tabelas do schema dashboards_pcp
-- Baseado na lista real de tabelas do banco

-- Habilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS dashboards_pcp.acompanhamento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.balanceamento_curva ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.balanceamento_estoque_acabado ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.calendario_fatur ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.calendario_prod ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.cards_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.carteira_me ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.carteira_mi ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.estoque_fundicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.estoque_produtos_estrategicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.faturamento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.historico_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.media_prensa_injetora ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.pedidos_recebidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.performance_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.resumo_por_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.vendas_diaria ENABLE ROW LEVEL SECURITY;

-- Criar políticas de SELECT público para todas as tabelas (dashboard é read-only)
-- Políticas permitem SELECT para authenticated e anon (PUBLIC)

-- acompanhamento_diario
DROP POLICY IF EXISTS allow_select_acompanhamento_diario ON dashboards_pcp.acompanhamento_diario;
CREATE POLICY allow_select_acompanhamento_diario ON dashboards_pcp.acompanhamento_diario FOR SELECT USING (true);

-- balanceamento_curva
DROP POLICY IF EXISTS allow_select_balanceamento_curva ON dashboards_pcp.balanceamento_curva;
CREATE POLICY allow_select_balanceamento_curva ON dashboards_pcp.balanceamento_curva FOR SELECT USING (true);

-- balanceamento_estoque_acabado
DROP POLICY IF EXISTS allow_select_balanceamento_estoque_acabado ON dashboards_pcp.balanceamento_estoque_acabado;
CREATE POLICY allow_select_balanceamento_estoque_acabado ON dashboards_pcp.balanceamento_estoque_acabado FOR SELECT USING (true);

-- calendario_fatur
DROP POLICY IF EXISTS allow_select_calendario_fatur ON dashboards_pcp.calendario_fatur;
CREATE POLICY allow_select_calendario_fatur ON dashboards_pcp.calendario_fatur FOR SELECT USING (true);

-- calendario_prod
DROP POLICY IF EXISTS allow_select_calendario_prod ON dashboards_pcp.calendario_prod;
CREATE POLICY allow_select_calendario_prod ON dashboards_pcp.calendario_prod FOR SELECT USING (true);

-- cards_pedidos
DROP POLICY IF EXISTS allow_select_cards_pedidos ON dashboards_pcp.cards_pedidos;
CREATE POLICY allow_select_cards_pedidos ON dashboards_pcp.cards_pedidos FOR SELECT USING (true);

-- carteira_me
DROP POLICY IF EXISTS allow_select_carteira_me ON dashboards_pcp.carteira_me;
CREATE POLICY allow_select_carteira_me ON dashboards_pcp.carteira_me FOR SELECT USING (true);

-- carteira_mi
DROP POLICY IF EXISTS allow_select_carteira_mi ON dashboards_pcp.carteira_mi;
CREATE POLICY allow_select_carteira_mi ON dashboards_pcp.carteira_mi FOR SELECT USING (true);

-- estoque_fundicao
DROP POLICY IF EXISTS allow_select_estoque_fundicao ON dashboards_pcp.estoque_fundicao;
CREATE POLICY allow_select_estoque_fundicao ON dashboards_pcp.estoque_fundicao FOR SELECT USING (true);

-- estoque_produtos_estrategicos
DROP POLICY IF EXISTS allow_select_estoque_produtos_estrategicos ON dashboards_pcp.estoque_produtos_estrategicos;
CREATE POLICY allow_select_estoque_produtos_estrategicos ON dashboards_pcp.estoque_produtos_estrategicos FOR SELECT USING (true);

-- faturamento_diario
DROP POLICY IF EXISTS allow_select_faturamento_diario ON dashboards_pcp.faturamento_diario;
CREATE POLICY allow_select_faturamento_diario ON dashboards_pcp.faturamento_diario FOR SELECT USING (true);

-- historico_pedidos
DROP POLICY IF EXISTS allow_select_historico_pedidos ON dashboards_pcp.historico_pedidos;
CREATE POLICY allow_select_historico_pedidos ON dashboards_pcp.historico_pedidos FOR SELECT USING (true);

-- media_prensa_injetora
DROP POLICY IF EXISTS allow_select_media_prensa_injetora ON dashboards_pcp.media_prensa_injetora;
CREATE POLICY allow_select_media_prensa_injetora ON dashboards_pcp.media_prensa_injetora FOR SELECT USING (true);

-- metas
DROP POLICY IF EXISTS allow_select_metas ON dashboards_pcp.metas;
CREATE POLICY allow_select_metas ON dashboards_pcp.metas FOR SELECT USING (true);

-- pedidos_recebidos
DROP POLICY IF EXISTS allow_select_pedidos_recebidos ON dashboards_pcp.pedidos_recebidos;
CREATE POLICY allow_select_pedidos_recebidos ON dashboards_pcp.pedidos_recebidos FOR SELECT USING (true);

-- performance_entrega
DROP POLICY IF EXISTS allow_select_performance_entrega ON dashboards_pcp.performance_entrega;
CREATE POLICY allow_select_performance_entrega ON dashboards_pcp.performance_entrega FOR SELECT USING (true);

-- resumo_por_item
DROP POLICY IF EXISTS allow_select_resumo_por_item ON dashboards_pcp.resumo_por_item;
CREATE POLICY allow_select_resumo_por_item ON dashboards_pcp.resumo_por_item FOR SELECT USING (true);

-- vendas_diaria
DROP POLICY IF EXISTS allow_select_vendas_diaria ON dashboards_pcp.vendas_diaria;
CREATE POLICY allow_select_vendas_diaria ON dashboards_pcp.vendas_diaria FOR SELECT USING (true);

-- Garantir permissões de USAGE no schema
GRANT USAGE ON SCHEMA dashboards_pcp TO authenticated, anon;

-- Garantir permissões de SELECT em todas as tabelas
GRANT SELECT ON ALL TABLES IN SCHEMA dashboards_pcp TO authenticated, anon;

-- Garantir permissões de SELECT em futuras tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboards_pcp GRANT SELECT ON TABLES TO authenticated, anon;
