-- 1. Create Tables to store parsed data
CREATE TABLE IF NOT EXISTS dashboards.cards_pedidos (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    total INTEGER DEFAULT 0,
    conferir INTEGER DEFAULT 0,
    pendente INTEGER DEFAULT 0,
    emitir_nf INTEGER DEFAULT 0,
    expedicao INTEGER DEFAULT 0,
    frete_faf INTEGER DEFAULT 0,
    programado INTEGER DEFAULT 0,
    chegou_hoje INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dashboards.carteira_pedidos (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tipo TEXT NOT NULL, -- 'ME' or 'MI'
    sem_saldo NUMERIC DEFAULT 0,
    nao_alocado NUMERIC DEFAULT 0,
    faf_impressa NUMERIC DEFAULT 0,
    nao_efetivado NUMERIC DEFAULT 0,
    alocad_parcial NUMERIC DEFAULT 0,
    embarque_criado NUMERIC DEFAULT 0,
    pesagem_realizada NUMERIC DEFAULT 0,
    frete_analisado NUMERIC DEFAULT 0,
    pedido_separado NUMERIC DEFAULT 0,
    pedido_embalando_total NUMERIC DEFAULT 0,
    pedido_embalando_parcial NUMERIC DEFAULT 0
);

-- 2. Create Function to Process JSON from Webhook
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
    -- Check source
    IF NEW.source <> 'datasul_dashboards' THEN
        RETURN NEW;
    END IF;

    v_payload := NEW.payload;
    v_painel1 := v_payload->'painel1';
    v_painel3 := v_payload->'painel3';

    -- PROCESS PAINEL 1: Cards Pedidos
    IF v_painel1 IS NOT NULL THEN
        v_cards := v_painel1->'cardsPedidos';
        IF v_cards IS NOT NULL THEN
            -- Strategy: Delete all and insert new snapshot
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
    END IF;

    -- PROCESS PAINEL 3: Carteira (ME / MI)
    IF v_painel3 IS NOT NULL THEN
        -- Delete current state
        DELETE FROM dashboards.carteira_pedidos;

        -- ME (Mercado Externo)
        v_me := v_painel3->'carteirame';
        IF v_me IS NOT NULL THEN
            INSERT INTO dashboards.carteira_pedidos (
                tipo, sem_saldo, nao_alocado, faf_impressa, nao_efetivado, 
                alocad_parcial, embarque_criado, pesagem_realizada,
                frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial
            ) VALUES (
                'ME',
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

        -- MI (Mercado Interno)
        v_mi := v_painel3->'carteirami';
        IF v_mi IS NOT NULL THEN
            INSERT INTO dashboards.carteira_pedidos (
                tipo, sem_saldo, nao_alocado, faf_impressa, nao_efetivado, 
                alocad_parcial, embarque_criado, pesagem_realizada,
                frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial
            ) VALUES (
                'MI',
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

-- 3. Attach Trigger to webhook_logs (or general_data if that's where insertion happens)
-- Assuming 'public.webhook_logs' is the entry point as per conversation history.
DROP TRIGGER IF EXISTS trg_process_dashboards_json ON public.webhook_logs;

CREATE TRIGGER trg_process_dashboards_json
    AFTER INSERT ON public.webhook_logs
    FOR EACH ROW
    EXECUTE FUNCTION dashboards.process_datasul_json();

-- Log access
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboards.cards_pedidos TO postgres, service_role, authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboards.carteira_pedidos TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION dashboards.process_datasul_json() TO postgres, service_role, authenticated, anon;
