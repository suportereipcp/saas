-- Função consolidada para determinar a regra de prazo
CREATE OR REPLACE FUNCTION app_controle_prazo_qualidade.get_item_deadline_rule(p_item_code TEXT)
RETURNS TEXT AS $$
DECLARE
    v_has_super_urgent BOOLEAN := FALSE;
    v_has_urgent BOOLEAN := FALSE;
BEGIN
    -- 1. Verifica REGRA 2 HORAS (Famílias 1000 a 1003 na árvore ASCENDENTE/PAIS - Onde Usado)
    -- Explode recursivamente "Onde Usado"
    WITH RECURSIVE where_used AS (
        -- Nível 0: O próprio item
        SELECT p_item_code as item_code, 0 as level
        
        UNION ALL

        -- Nível 1: Pais diretos do item (Onde 'p_item_code' aparece como 'it-codigo')
        SELECT es_codigo, 1
        FROM datasul.estrutura
        WHERE it_codigo = p_item_code
        
        UNION ALL
        
        -- Recursão: Subir na árvore (Buscar pais dos pais)
        -- e.it_codigo (filho na tabela) = wu.item_code (pai encontrado anteriormente)
        SELECT e.es_codigo, wu.level + 1
        FROM datasul.estrutura e
        INNER JOIN where_used wu ON e.it_codigo = wu.item_code
        WHERE wu.level < 20
    )
    SELECT EXISTS (
        SELECT 1
        FROM where_used wu
        JOIN datasul.item i ON wu.item_code = i.it_codigo
        WHERE i.fm_codigo IN ('1000', '1001', '1002', '1003')
    ) INTO v_has_super_urgent;

    IF v_has_super_urgent THEN
        RETURN '2 HOURS';
    END IF;

    -- 2. Regra Padrão se não for Super Urgente: 4 HORAS
    -- (Usuario confirmou que nao existe prazo de 2 dias, apenas 2h e 4h)
    RETURN '4 HOURS';
END;
$$ LANGUAGE plpgsql STABLE;

-- VIEW consolidada atualizada (opcional, só para garantir)
CREATE OR REPLACE VIEW app_controle_prazo_qualidade.production_items_view AS
SELECT 
    pi.*,
    app_controle_prazo_qualidade.get_item_calculation_priority(pi.it_codigo) as calculation_priority,
    i.desc_item as product_description
FROM app_controle_prazo_qualidade.production_items pi
LEFT JOIN datasul.item i ON pi.it_codigo = i.it_codigo;
