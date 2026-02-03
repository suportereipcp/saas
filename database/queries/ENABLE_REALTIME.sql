-- ====================================================================
-- ATENÇÃO: COLE ESTE SQL NO SUPABASE STUDIO (SQL EDITOR)
-- ====================================================================
-- Este script habilita Realtime para os dashboards PCP
-- ✅ VERSÃO IDEMPOTENTE - Pode rodar múltiplas vezes sem erro
-- 
-- INSTRUÇÕES:
-- 1. Abrir Supabase Studio em: http://127.0.0.1:54323/project/default/sql/new
-- 2. Copiar TODO este conteúdo (Ctrl+A, Ctrl+C)
-- 3. Colar no SQL Editor
-- 4. Clicar em "RUN" (ou apertar Ctrl+Enter)
-- ====================================================================

-- Set REPLICA IDENTITY FULL for all tables (sempre funciona, mesmo se já configurado)
ALTER TABLE dashboards_pcp.acompanhamento_diario REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.balanceamento_curva REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.balanceamento_estoque_acabado REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.calendario_fatur REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.calendario_prod REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.cards_pedidos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.carteira_me REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.carteira_mi REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.estoque_fundicao REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.estoque_produtos_estrategicos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.faturamento_diario REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.historico_pedidos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.media_prensa_injetora REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.metas REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.pedidos_recebidos REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.performance_entrega REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.resumo_por_item REPLICA IDENTITY FULL;
ALTER TABLE dashboards_pcp.vendas_diaria REPLICA IDENTITY FULL;

-- Cria uma função helper para adicionar tabelas à publicação sem erro
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'acompanhamento_diario',
        'balanceamento_curva',
        'balanceamento_estoque_acabado',
        'calendario_fatur',
        'calendario_prod',
        'cards_pedidos',
        'carteira_me',
        'carteira_mi',
        'estoque_fundicao',
        'estoque_produtos_estrategicos',
        'faturamento_diario',
        'historico_pedidos',
        'media_prensa_injetora',
        'metas',
        'pedidos_recebidos',
        'performance_entrega',
        'resumo_por_item',
        'vendas_diaria'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE dashboards_pcp.%I', tbl);
            RAISE NOTICE 'Adicionado: %', tbl;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Já existe: %', tbl;
        END;
    END LOOP;
END $$;

-- ====================================================================
-- ✅ SUCESSO! Realtime habilitado em todas as 18 tabelas.
-- 
-- PRÓXIMO PASSO:
-- 1. Recarregue a página do dashboard (F5)
-- 2. Mude algum dado no Supabase (ex: metas, estoque_fundicao)
-- 3. Veja o dashboard atualizar AUTOMATICAMENTE em 2-3 segundos!
-- ====================================================================
