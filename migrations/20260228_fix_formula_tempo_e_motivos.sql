-- 1. Recria a View de Produtos com a Matemática Exata de Tempos
-- O cálculo anterior multiplicava cavidade apenas pelo maquinário. 
-- A nova fórmula reproduz a regra do Datasul: ((tempo_homem * cavidade) + (tempo_maquin * cavidade)) * 60
DROP VIEW IF EXISTS apont_rubber_prensa.vw_produtos_datasul;

CREATE VIEW apont_rubber_prensa.vw_produtos_datasul AS
SELECT
    TRIM(i.it_codigo) AS codigo_item,
    i.desc_item AS descricao,
    COALESCE(i.lote_multipl, 1) AS cavidades,
    COALESCE(
        ce.tempo_ciclo_ideal_segundos,
        (
            (COALESCE(op.tempo_maquin, 0) * COALESCE(i.lote_multipl, 1)) + 
            (COALESCE(op.tempo_homem, 0) * COALESCE(i.lote_multipl, 1))
        ) * 60,
        300
    )::INTEGER AS tempo_ciclo_ideal_segundos
FROM datasul.item i
LEFT JOIN datasul.operacao op
    ON i.it_codigo = op.it_codigo
    AND UPPER(TRIM(op.descricao)) IN ('VULCANIZACAO', 'VULCANIZACAO RUBBER')
LEFT JOIN apont_rubber_prensa.config_engenharia ce ON i.it_codigo = ce.codigo_item;

-- 2. Concede permissões para a API do Supabase (PostgREST) enxergar os Motivos de Parada.
-- Sem essas Permissões as Rotas HTTP de Front-End e o Sincronizador Backend recebem a lista "Vazia".
GRANT SELECT ON apont_rubber_prensa.vw_produtos_datasul TO anon, authenticated, service_role;
GRANT SELECT ON apont_rubber_prensa.cad_motivos_parada TO anon, authenticated, service_role;

-- 3. Força a API do Supabase a atualizar o seu "esquema" para ler as tabelas recém permitidas.
NOTIFY pgrst, 'reload schema';
