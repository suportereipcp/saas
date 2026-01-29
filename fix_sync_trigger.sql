-- FIX: Ensure the function exists in the correct schema and the trigger is applied

-- 1. Create/Replace the Function in app_controle_prazo_qualidade schema
CREATE OR REPLACE FUNCTION app_controle_prazo_qualidade.sync_jat_to_production()
RETURNS TRIGGER AS $$
DECLARE
    v_deadline_interval INTERVAL;
    v_start_time TIMESTAMP WITH TIME ZONE := NOW();
    v_priority TEXT;
    v_rule TEXT;
BEGIN
    -- Busca prioridade (apenas para log e view)
    v_priority := app_controle_prazo_qualidade.get_item_calculation_priority(NEW."it-codigo"::TEXT);

    -- Busca regra de prazo (Centralizada)
    -- Retorna '2 HOURS', '4 HOURS' ou '2 DAYS'
    v_rule := app_controle_prazo_qualidade.get_item_deadline_rule(NEW."it-codigo"::TEXT);
    
    IF v_rule = '2 HOURS' THEN
        v_deadline_interval := '2 hours';
    ELSIF v_rule = '4 HOURS' THEN
        v_deadline_interval := '4 hours';
    ELSE
        v_deadline_interval := '4 hours'; -- Padrão 4h
    END IF;

    -- Log para debug
    RAISE NOTICE 'Sync Trigger Fired | Item: % | Solicitacao: % | Prioridade: % | Prazo: %', 
                 NEW."it-codigo", NEW."nr-solicitacao", v_priority, v_deadline_interval;

    -- Tenta Atualizar o registro existente
    UPDATE app_controle_prazo_qualidade.production_items 
    SET quantity = CAST(NEW."qt-atendida" AS INTEGER),
        updated_at = NOW()
    WHERE nr_solicitacao = CAST(NEW."nr-solicitacao" AS INTEGER) 
      AND it_codigo = NEW."it-codigo";
    
    -- REMOVIDO: datasul_finished_at = v_start_time
    -- Motivo: preservamos a data original de chegada.

    -- Se não encontrou, INSERE novo
    IF NOT FOUND THEN
        INSERT INTO app_controle_prazo_qualidade.production_items (
            nr_solicitacao, 
            it_codigo, 
            quantity, 
            datasul_finished_at, 
            wash_deadline, 
            status,
            created_at,
            updated_at
        ) VALUES (
            CAST(NEW."nr-solicitacao" AS INTEGER), 
            NEW."it-codigo", 
            CAST(NEW."qt-atendida" AS INTEGER), 
            v_start_time, 
            v_start_time + v_deadline_interval,
            'WASHING',
            NOW(),
            NOW()
        );
        -- Nota: A tabela pode nao ter calculation_priority fisico, mas a view tem. 
        -- No insert acima, se a coluna não existir, vai dar erro. 
        -- Como não tenho certeza da estrutura da tabela fisica, vou remover o campo do INSERT e deixar a View calcular ou criar uma coluna.
        -- UPDATE: A view usa JOIN, então não precisa inserir na tabela.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing triggers to avoid duplication (check both names used historically)
DROP TRIGGER IF EXISTS trg_sync_jat_production ON datasul.solicita_material_jat;
DROP TRIGGER IF EXISTS trg_sync_jat_to_production_items ON datasul.solicita_material_jat;

-- 3. Create the Trigger
CREATE TRIGGER trg_sync_jat_production
    AFTER INSERT OR UPDATE ON datasul.solicita_material_jat
    FOR EACH ROW
    EXECUTE FUNCTION app_controle_prazo_qualidade.sync_jat_to_production();
    
-- Check permissions
GRANT EXECUTE ON FUNCTION app_controle_prazo_qualidade.sync_jat_to_production() TO postgres, anon, authenticated, service_role;
