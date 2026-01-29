-- Migration: Rename schema, Add Column, Update Function
-- Date: 2026-01-29
-- Goal: Rename `dashboards` -> `dashboards_pcp`, add missing column, and update ingestion logic.

-- 1. Rename Schema
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dashboards') THEN
        ALTER SCHEMA dashboards RENAME TO dashboards_pcp;
    END IF;
END
$$;

-- 2. Add Missing Column to balanceamento_curva if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'dashboards_pcp' AND table_name = 'balanceamento_curva' AND column_name = 'acima_120') THEN
        ALTER TABLE dashboards_pcp.balanceamento_curva ADD COLUMN acima_120 INT DEFAULT 0;
    END IF;
END
$$;

-- 3. Update Function with New Schema References and Logic
CREATE OR REPLACE FUNCTION dashboards_pcp.process_datasul_json()
RETURNS TRIGGER AS $$
DECLARE
    v_payload JSONB;
    v_painel1 JSONB;
    v_painel2 JSONB;
    v_painel3 JSONB;
    v_item JSONB;
    
    -- Variaveis para Balanceamento Curva
    v_bal JSONB;
    v_val_d60 INT;
    v_val_d90 INT;
    v_curva text[] := ARRAY['A', 'B', 'C'];
    v_c text;
    v_col_d60_120 INT;
    v_col_d0_120 INT;
    v_col_total INT;
    v_acima_120 INT;

BEGIN
    -- 1. Validação da Fonte
    IF NEW.source NOT IN ('datasul_dashboards', 'datasul_dashboards_pcprei') THEN
        RETURN NEW;
    END IF;

    v_payload := NEW.payload;
    v_painel1 := v_payload->'painel1';
    v_painel2 := v_payload->'painel2';
    v_painel3 := v_payload->'painel3';

    -- === PAINEL 1 ===
    IF v_painel1 IS NOT NULL THEN
        -- Cards Pedidos
        IF (v_painel1->'cardsPedidos') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.cards_pedidos WHERE 1=1;
            INSERT INTO dashboards_pcp.cards_pedidos (total, conferir, pendente, emitir_nf, expedicao, frete_faf, programado, chegou_hoje)
            SELECT 
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'total', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'conferir', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'pendente', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'emitir_nf', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'expedicao', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'frete_faf', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'programado', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'cardsPedidos'->>'chegou_hoje', '')::INT, 0);
        END IF;

        -- Estoque Estratégico
        IF (v_painel1->'estoqueEstrategico') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.estoque_produtos_estrategicos WHERE 1=1;
            INSERT INTO dashboards_pcp.estoque_produtos_estrategicos (prensado, jato, adesivo)
            SELECT 
                COALESCE(NULLIF(v_painel1->'estoqueEstrategico'->>'prensado', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'estoqueEstrategico'->>'jato', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'estoqueEstrategico'->>'adesivo', '')::INT, 0);
        END IF;

        -- Estoque Acabado
        IF (v_painel1->'estoqueAcabado') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.balanceamento_estoque_acabado WHERE 1=1;
            INSERT INTO dashboards_pcp.balanceamento_estoque_acabado (estoque_total, carteira_pedidos, estoque_disponivel)
            SELECT 
                COALESCE(NULLIF(v_painel1->'estoqueAcabado'->>'estoqueTotal', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'estoqueAcabado'->>'carteiraPedidos', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'estoqueAcabado'->>'estoqueDisponivel', '')::INT, 0);
        END IF;
        
        -- Performance Entrega
        IF (v_painel1->'performanceEntrega') IS NOT NULL THEN 
            DELETE FROM dashboards_pcp.performance_entrega WHERE 1=1;
            INSERT INTO dashboards_pcp.performance_entrega (
                total_pedidos, dias_0, perc_0, dias_1, perc_1, dias_2, perc_2, 
                dias_3, perc_3, dias_4, perc_4, dias_5, perc_5, acima_5, perc_acima_5
            ) SELECT
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'total_pedidos', '')::INT, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'dias_0', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_0', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'dias_1', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_1', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'dias_2', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_2', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'dias_3', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_3', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'dias_4', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_4', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'dias_5', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_5', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'acima_5', '')::INT, 0), COALESCE(NULLIF(v_painel1->'performanceEntrega'->>'perc_acima_5', '')::NUMERIC, 0);
        END IF;

        -- Arrays
        IF (v_painel1->'resumoPorItem') IS NOT NULL THEN 
            DELETE FROM dashboards_pcp.resumo_por_item WHERE 1=1;
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_painel1->'resumoPorItem') LOOP
                INSERT INTO dashboards_pcp.resumo_por_item (it_codigo, desc_item, curva, qtd_pecas, qtd_pedidos)
                VALUES (
                    v_item->>'item', 
                    v_item->>'descricao', 
                    v_item->>'curva', 
                    COALESCE(NULLIF(v_item->>'qtdPecas', '')::NUMERIC, 0), 
                    COALESCE(NULLIF(v_item->>'qtdPedidos', '')::INT, 0)
                );
            END LOOP;
        END IF;

        IF (v_painel1->'historicoPendencia') IS NOT NULL THEN 
            DELETE FROM dashboards_pcp.historico_pedidos WHERE 1=1;
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_painel1->'historicoPendencia') LOOP
                INSERT INTO dashboards_pcp.historico_pedidos (data, qtd_ped)
                VALUES (
                    to_date(NULLIF(v_item->>'data', ''), 'DD/MM/YYYY'), 
                    COALESCE(NULLIF(v_item->>'qtdePed', '')::INT, 0)
                );
            END LOOP;
        END IF;

        IF (v_painel1->'pedidosRecebidosSemana') IS NOT NULL THEN 
            DELETE FROM dashboards_pcp.pedidos_recebidos WHERE 1=1;
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_painel1->'pedidosRecebidosSemana') LOOP
                INSERT INTO dashboards_pcp.pedidos_recebidos (data, qtd_ped)
                VALUES (
                    to_date(NULLIF(v_item->>'date', ''), 'DD/MM/YYYY'), 
                    COALESCE(NULLIF(v_item->>'recebidos', '')::INT, 0)
                );
            END LOOP;
        END IF;

        -- Balanceamento Curva (NOVO)
        v_bal := v_painel1->'balanceamentoEstoque';
        IF v_bal IS NOT NULL THEN
            DELETE FROM dashboards_pcp.balanceamento_curva WHERE 1=1;
            
            FOREACH v_c IN ARRAY v_curva LOOP
                -- Logica de soma das colunas
                v_val_d60  := COALESCE(NULLIF(v_bal->'60_a_90_dias'->>v_c, '')::INT, 0);
                v_val_d90  := COALESCE(NULLIF(v_bal->'90_a_120_dias'->>v_c, '')::INT, 0);
                v_col_d60_120 := v_val_d60 + v_val_d90;
                
                v_col_d0_120 := 
                    COALESCE(NULLIF(v_bal->'ate_15_dias'->>v_c, '')::INT, 0) +
                    COALESCE(NULLIF(v_bal->'15_a_30_dias'->>v_c, '')::INT, 0) +
                    COALESCE(NULLIF(v_bal->'30_a_60_dias'->>v_c, '')::INT, 0) +
                    v_col_d60_120;
                
                v_acima_120 := COALESCE(NULLIF(v_bal->'acima_120_dias'->>v_c, '')::INT, 0);
                v_col_total := v_col_d0_120 + v_acima_120;
                
                INSERT INTO dashboards_pcp.balanceamento_curva (
                    curva, d0_15, d15_30, d15_60, d60_120, d0_120, total, acima_120
                ) VALUES (
                    v_c,
                    COALESCE(NULLIF(v_bal->'ate_15_dias'->>v_c, '')::INT, 0),
                    COALESCE(NULLIF(v_bal->'15_a_30_dias'->>v_c, '')::INT, 0),
                    COALESCE(NULLIF(v_bal->'30_a_60_dias'->>v_c, '')::INT, 0),
                    v_col_d60_120,
                    v_col_d0_120,
                    v_col_total,
                    v_acima_120
                );
            END LOOP;
        END IF;
    END IF;

    -- === PAINEL 2 ===
    IF v_painel2 IS NOT NULL THEN
        IF (v_painel2->'estoqueFundicao') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.estoque_fundicao WHERE 1=1;
            INSERT INTO dashboards_pcp.estoque_fundicao (estoque_aluminio, estoque_fundido, recebido_aluminio, recebido_fundido)
            SELECT 
                COALESCE(NULLIF(v_painel2->'estoqueFundicao'->>'estoqueAluminio', '')::INT, 0),
                COALESCE(NULLIF(v_painel2->'estoqueFundicao'->>'estoqueFerro', '')::INT, 0),
                COALESCE(NULLIF(v_painel2->'estoqueFundicao'->>'recebidoAluminio', '')::INT, 0),
                COALESCE(NULLIF(v_painel2->'estoqueFundicao'->>'recebidoAluminio', '')::INT, 0); 
        END IF;
        
        IF (v_painel2->'producaoMaquinas') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.media_prensa_injetora WHERE 1=1;
            INSERT INTO dashboards_pcp.media_prensa_injetora (prensa_rei, injetora_rei, prensa_rubber, injetora_rubber)
            SELECT 
                COALESCE(NULLIF(v_painel2->'producaoMaquinas'->>'prensaRei', '')::INT, 0),
                COALESCE(NULLIF(v_painel2->'producaoMaquinas'->>'injetoraRei', '')::INT, 0),
                COALESCE(NULLIF(v_painel2->'producaoMaquinas'->>'prensaRubber', '')::INT, 0),
                COALESCE(NULLIF(v_painel2->'producaoMaquinas'->>'injetoraRubber', '')::INT, 0);
        END IF;

        IF (v_painel2->'comparativoMensal') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.acompanhamento_diario WHERE 1=1;
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_painel2->'comparativoMensal') LOOP
                INSERT INTO dashboards_pcp.acompanhamento_diario (data, fat, prod, vend)
                VALUES (
                    to_date(NULLIF(v_item->>'date', ''), 'DD/MM/YYYY'), 
                    COALESCE(NULLIF(v_item->>'fat', '')::INT, 0), 
                    COALESCE(NULLIF(v_item->>'prod', '')::INT, 0), 
                    COALESCE(NULLIF(v_item->>'vend', '')::INT, 0)
                );
            END LOOP;
        END IF;
    END IF;

    -- === PAINEL 3 ===
    IF v_painel3 IS NOT NULL THEN
        IF (v_painel3->'carteiraME') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.carteira_me WHERE 1=1;
            INSERT INTO dashboards_pcp.carteira_me (sem_saldo, nao_alocado, faf_impressa, nao_efetivado, alocad_parcial, embarque_criado, pesagem_realizada, frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial)
            SELECT 
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'semSaldo', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'naoAlocado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'fafImpressa', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'naoEfetivado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'alocParcial', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'embarqueCriado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'pes', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'freteAnalisado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'pedSepara', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'embTotExp', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraME'->>'embParExp', '')::NUMERIC, 0);
        END IF;

        IF (v_painel3->'carteiraMI') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.carteira_mi WHERE 1=1;
            INSERT INTO dashboards_pcp.carteira_mi (sem_saldo, nao_alocado, faf_impressa, nao_efetivado, alocad_parcial, embarque_criado, pesagem_realizada, frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial)
            SELECT 
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'semSaldo', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'naoAlocado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'fafImpressa', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'naoEfetivado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'alocParcial', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'embarqueCriado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'pes', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'freteAnalisado', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'pedSepara', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'embTotExp', '')::NUMERIC, 0),
                COALESCE(NULLIF(v_painel3->'carteiraMI'->>'embParExp', '')::NUMERIC, 0);
        END IF;

        IF (v_painel3->'faturamentoDiario') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.faturamento_diario WHERE 1=1;
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_painel3->'faturamentoDiario') LOOP
                INSERT INTO dashboards_pcp.faturamento_diario (data, valor, mercado)
                VALUES (
                    to_date(NULLIF(v_item->>'date', ''), 'DD/MM/YYYY'), 
                    COALESCE(NULLIF(v_item->>'valor', '')::NUMERIC, 0), 
                    COALESCE(NULLIF(v_item->>'mercado', '')::INT, 0)
                );
            END LOOP;
        END IF;

        IF (v_painel3->'vendasDiarias') IS NOT NULL THEN
            DELETE FROM dashboards_pcp.vendas_diaria WHERE 1=1;
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_painel3->'vendasDiarias') LOOP
                INSERT INTO dashboards_pcp.vendas_diaria (data, valor)
                VALUES (
                    to_date(NULLIF(v_item->>'date', ''), 'DD/MM/YYYY'), 
                    COALESCE(NULLIF(v_item->>'valor', '')::NUMERIC, 0)
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop Old Trigger and Create New One
DROP TRIGGER IF EXISTS on_webhook_log_insert ON webhook_logs;

CREATE TRIGGER on_webhook_log_insert
BEFORE INSERT ON webhook_logs
FOR EACH ROW
EXECUTE FUNCTION dashboards_pcp.process_datasul_json();
