-- Inserir dados fictícios para teste de Inventário Rotativo
-- Centro de Custo: 3210302 (Alinhado com o print do usuário)

INSERT INTO inventario.inventario_rotativo (it_codigo, centro_custo, qtd_fisica, contado, dt_contagem)
VALUES
    ('ITEM-001', '3210302', '{}', false, NULL), -- Item pendente, nunca contado
    ('ITEM-002', '3210302', '{}', false, NULL), -- Item pendente
    ('ITEM-003', '3210302', '{10}', false, NOW() - INTERVAL '2 days'), -- Contado parcial/antigo, mas marcado como não finalizado (recontagem)
    ('ITEM-004', '3210302', '{50.5}', true, NOW()), -- Item já contado/finalizado hoje (não deve aparecer na lista pendente)
    ('ITEM-005', '3210302', '{}', false, NULL), 
    ('ITEM-999', 'OUTRO_CC', '{}', false, NULL); -- Outro centro de custo (não deve aparecer para o usuário 3210302)

-- Inserir descrição fictícia na tabela datasul.item (se existir e se aplicável, senão o código lida com falta de descrição)
-- Caso a tabela datasul.item não exista, o frontend motrará sem descrição ou "Sem descrição".
