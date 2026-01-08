-- 1. Adiciona a coluna física para armazenar o snapshot da prioridade
ALTER TABLE app_controle_prazo_qualidade.production_items 
ADD COLUMN IF NOT EXISTS calculation_priority TEXT;

-- 2. Função de snapshot: Executada apenas quando o item é finalizado
CREATE OR REPLACE FUNCTION app_controle_prazo_qualidade.freeze_priority_on_finish()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para FINISHED e a coluna ainda está vazia (ou acabou de ser finalizada)
    IF NEW.status = 'FINISHED' AND (OLD.status IS NULL OR OLD.status != 'FINISHED') THEN
        NEW.calculation_priority := app_controle_prazo_qualidade.get_item_calculation_priority(NEW.it_codigo);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Gatilho para disparar o snapshot
DROP TRIGGER IF EXISTS trg_freeze_priority ON app_controle_prazo_qualidade.production_items;
CREATE TRIGGER trg_freeze_priority
BEFORE UPDATE ON app_controle_prazo_qualidade.production_items
FOR EACH ROW
EXECUTE FUNCTION app_controle_prazo_qualidade.freeze_priority_on_finish();

-- 4. Atualiza a View para priorizar o valor salvo (Snapshot) ou calcular em tempo real (Ativos)
DROP VIEW IF EXISTS app_controle_prazo_qualidade.production_items_view;
CREATE OR REPLACE VIEW app_controle_prazo_qualidade.production_items_view AS
SELECT 
    pi.*,
    -- Prioriza o valor físico (congelado). Se for NULL, calcula em tempo real.
    COALESCE(pi.calculation_priority, app_controle_prazo_qualidade.get_item_calculation_priority(pi.it_codigo)) as calculation_priority,
    i.desc_item as product_description
FROM app_controle_prazo_qualidade.production_items pi
LEFT JOIN datasul.item i ON pi.it_codigo = i.it_codigo;

-- Conceder permissão de leitura na view
GRANT SELECT ON app_controle_prazo_qualidade.production_items_view TO authenticated, anon;
