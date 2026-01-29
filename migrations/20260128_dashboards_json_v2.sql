-- FUNCTION: Process JSON from Webhook (Schema: dashboards)
CREATE OR REPLACE FUNCTION dashboards.process_datasul_json()
RETURNS TRIGGER AS $$
DECLARE
    v_payload JSONB;
    v_painel1 JSONB;
    v_painel3 JSONB;
    v_cards JSONB;
    v_me JSONB;
    v_mi JSONB;
BEGIN
    -- 1. Validate Source
    IF NEW.source IS DISTINCT FROM 'datasul_dashboards' THEN
        RETURN NEW;
    END IF;

    v_payload := NEW.payload;
    v_painel1 := v_payload->'painel1';
    v_painel3 := v_payload->'painel3';

    -- 2. Process Cards Pedidos (Painel 1)
    IF v_painel1 IS NOT NULL AND (v_painel1->'cardsPedidos') IS NOT NULL THEN
        v_cards := v_painel1->'cardsPedidos';
        
        -- Overwrite strategy: Delete all, then Insert
        DELETE FROM dashboards.cards_pedidos;
        
        INSERT INTO dashboards.cards_pedidos (
            total, conferir, pendente, emitir_nf, expedicao, 
            frete_faf, programado, chegou_hoje
        ) VALUES (
            COALESCE((v_cards->>'total')::INTEGER, 0),
            COALESCE((v_cards->>'conferir')::INTEGER, 0),
            COALESCE((v_cards->>'pendente')::INTEGER, 0),
            COALESCE((v_cards->>'emitir_nf')::INTEGER, 0),
            COALESCE((v_cards->>'expedicao')::INTEGER, 0),
            COALESCE((v_cards->>'frete_faf')::INTEGER, 0),
            COALESCE((v_cards->>'programado')::INTEGER, 0),
            COALESCE((v_cards->>'chegou_hoje')::INTEGER, 0)
        );
    END IF;

    -- 3. Process Carteira (Painel 3)
    IF v_painel3 IS NOT NULL THEN
        
        -- Mercado Externo (ME)
        v_me := v_painel3->'carteirame';
        IF v_me IS NOT NULL THEN
            DELETE FROM dashboards.carteira_me; -- Separate Table as per user request/image
            
            INSERT INTO dashboards.carteira_me (
                sem_saldo, nao_alocado, faf_impressa, nao_efetivado, 
                alocad_parcial, embarque_criado, pesagem_realizada,
                frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial
            ) VALUES (
                COALESCE((v_me->>'sem_saldo')::NUMERIC, 0),
                COALESCE((v_me->>'nao_alocado')::NUMERIC, 0),
                COALESCE((v_me->>'faf_impressa')::NUMERIC, 0),
                COALESCE((v_me->>'nao_efetivado')::NUMERIC, 0),
                COALESCE((v_me->>'alocad_parcial')::NUMERIC, 0),
                COALESCE((v_me->>'embarque_criado')::NUMERIC, 0),
                COALESCE((v_me->>'pesagem_realizada')::NUMERIC, 0),
                COALESCE((v_me->>'frete_analisado')::NUMERIC, 0),
                COALESCE((v_me->>'pedido_separado')::NUMERIC, 0),
                COALESCE((v_me->>'pedido_embalando_total')::NUMERIC, 0),
                COALESCE((v_me->>'pedido_embalando_parcial')::NUMERIC, 0)
            );
        END IF;

        -- Mercado Interno (MI)
        v_mi := v_painel3->'carteirami';
        IF v_mi IS NOT NULL THEN
            DELETE FROM dashboards.carteira_mi; -- Separate Table
            
            INSERT INTO dashboards.carteira_mi (
                sem_saldo, nao_alocado, faf_impressa, nao_efetivado, 
                alocad_parcial, embarque_criado, pesagem_realizada,
                frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial
            ) VALUES (
                COALESCE((v_mi->>'sem_saldo')::NUMERIC, 0),
                COALESCE((v_mi->>'nao_alocado')::NUMERIC, 0),
                COALESCE((v_mi->>'faf_impressa')::NUMERIC, 0),
                COALESCE((v_mi->>'nao_efetivado')::NUMERIC, 0),
                COALESCE((v_mi->>'alocad_parcial')::NUMERIC, 0),
                COALESCE((v_mi->>'embarque_criado')::NUMERIC, 0),
                COALESCE((v_mi->>'pesagem_realizada')::NUMERIC, 0),
                COALESCE((v_mi->>'frete_analisado')::NUMERIC, 0),
                COALESCE((v_mi->>'pedido_separado')::NUMERIC, 0),
                COALESCE((v_mi->>'pedido_embalando_total')::NUMERIC, 0),
                COALESCE((v_mi->>'pedido_embalando_parcial')::NUMERIC, 0)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION dashboards.process_datasul_json() TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE dashboards.cards_pedidos TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE dashboards.carteira_me TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE dashboards.carteira_mi TO postgres, service_role, authenticated, anon;

-- TRIGGER: Public Webhook Logs -> Dashboards Function
DROP TRIGGER IF EXISTS trg_process_dashboards_json ON public.webhook_logs;

CREATE TRIGGER trg_process_dashboards_json
    AFTER INSERT ON public.webhook_logs
    FOR EACH ROW
    EXECUTE FUNCTION dashboards.process_datasul_json();
