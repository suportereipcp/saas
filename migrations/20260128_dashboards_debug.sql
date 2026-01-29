-- FUNCTION: Process JSON from Webhook (Debug Version)
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
    -- DEBUG LOGS
    RAISE NOTICE 'Trigger dashboards.process_datasul_json FIRED. Source: %', NEW.source;

    -- 1. Validate Source
    IF NEW.source IS DISTINCT FROM 'datasul_dashboards' THEN
        RAISE NOTICE 'Source mismatch. Expected datasul_dashboards, got %', NEW.source;
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Source matched. Parsing Payload...';
    v_payload := NEW.payload;
    
    -- Extract Parts
    v_painel1 := v_payload->'painel1';
    v_painel3 := v_payload->'painel3';

    RAISE NOTICE 'Painel 1: %, Painel 3: %', (v_painel1 IS NOT NULL), (v_painel3 IS NOT NULL);

    -- 2. Process Cards Pedidos (Painel 1)
    IF v_painel1 IS NOT NULL THEN
        v_cards := v_painel1->'cardsPedidos';
        RAISE NOTICE 'Cards Pedidos found: %', (v_cards IS NOT NULL);
        
        IF v_cards IS NOT NULL THEN
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
            RAISE NOTICE 'Inserted into cards_pedidos.';
        END IF;
    END IF;

    -- 3. Process Carteira (Painel 3)
    IF v_painel3 IS NOT NULL THEN
        
        -- Mercado Externo (ME)
        v_me := v_painel3->'carteirame';
        RAISE NOTICE 'Carteira ME found: %', (v_me IS NOT NULL);
        
        IF v_me IS NOT NULL THEN
            DELETE FROM dashboards.carteira_me;
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
            RAISE NOTICE 'Inserted into carteira_me.';
        END IF;

        -- Mercado Interno (MI)
        v_mi := v_painel3->'carteirami';
        RAISE NOTICE 'Carteira MI found: %', (v_mi IS NOT NULL);

        IF v_mi IS NOT NULL THEN
            DELETE FROM dashboards.carteira_mi;
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
            RAISE NOTICE 'Inserted into carteira_mi.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
