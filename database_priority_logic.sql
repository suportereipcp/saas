-- Função recursiva para buscar a prioridade de cálculo baseada na BOM (Estrutura)
CREATE OR REPLACE FUNCTION app_controle_prazo_qualidade.get_item_calculation_priority(p_es_codigo VARCHAR)
RETURNS TEXT AS $$
DECLARE
    v_min_calculo INTEGER;
BEGIN
    WITH RECURSIVE bomb_parents AS (
        -- Nível 1: Pais diretos do item (onde o item atual é o componente es_codigo)
        SELECT it_codigo as parent_code, 1 as level
        FROM datasul.estrutura
        WHERE es_codigo = p_es_codigo
        
        UNION ALL
        
        -- Recursão: Subir na árvore (o pai anterior vira o componente do próximo nível)
        SELECT e.it_codigo, bp.level + 1
        FROM datasul.estrutura e
        INNER JOIN bomb_parents bp ON e.es_codigo = bp.parent_code
        WHERE bp.level < 10 -- Limite de segurança contra ciclos infinitos
    ),
    found_priorities AS (
        -- Associa os pais encontrados com as famílias alvo e a tabela de prioridades
        SELECT pri."nr-calculo"
        FROM bomb_parents bp
        JOIN datasul.item i ON bp.parent_code = i.it_codigo
        JOIN datasul."prioridade-producao" pri ON bp.parent_code = pri."it-codigo"
        WHERE i.fm_codigo IN ('SA-017', 'SA-018', 'SA-024', 'SA-028')
    )
    SELECT MIN("nr-calculo") INTO v_min_calculo FROM found_priorities;

    IF v_min_calculo IS NULL THEN
        RETURN NULL;
    ELSE
        RETURN 'Calculo ' || v_min_calculo;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- VIEW consolidada para o Frontend
DROP VIEW IF EXISTS app_controle_prazo_qualidade.production_items_view;
CREATE OR REPLACE VIEW app_controle_prazo_qualidade.production_items_view AS
SELECT 
    pi.*,
    app_controle_prazo_qualidade.get_item_calculation_priority(pi.it_codigo) as calculation_priority,
    i.desc_item as product_description
FROM app_controle_prazo_qualidade.production_items pi
LEFT JOIN datasul.item i ON pi.it_codigo = i.it_codigo;

-- Conceder permissão de leitura na view
GRANT SELECT ON app_controle_prazo_qualidade.production_items_view TO authenticated, anon;
