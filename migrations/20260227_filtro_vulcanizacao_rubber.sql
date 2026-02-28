-- 1. Recria a View de Produtos expandindo a regra de OPs do setor
-- e efetuando o TRIM() definitivo no código do item (Evita espaços em branco escondidos do ERP)
DROP VIEW IF EXISTS apont_rubber_prensa.vw_produtos_datasul;

CREATE VIEW apont_rubber_prensa.vw_produtos_datasul AS
SELECT
    TRIM(i.it_codigo) AS codigo_item,
    i.desc_item AS descricao,
    COALESCE(i.lote_multipl, 1) AS cavidades,
    COALESCE(
        ce.tempo_ciclo_ideal_segundos,
        ((COALESCE(op.tempo_maquin, 0) * COALESCE(i.lote_multipl, 1)) + COALESCE(op.tempo_homem, 0)) * 60,
        300
    )::INTEGER AS tempo_ciclo_ideal_segundos
FROM datasul.item i
LEFT JOIN datasul.operacao op
    ON i.it_codigo = op.it_codigo
    AND UPPER(TRIM(op.descricao)) IN ('VULCANIZACAO', 'VULCANIZACAO RUBBER')
LEFT JOIN apont_rubber_prensa.config_engenharia ce ON i.it_codigo = ce.codigo_item;


-- 2. Concede permissões explícitas de leitura absoluta às views
-- para os scripts CronJS (service_role) e para Auth padrão.
GRANT SELECT ON apont_rubber_prensa.vw_produtos_datasul TO authenticated, anon, service_role;
