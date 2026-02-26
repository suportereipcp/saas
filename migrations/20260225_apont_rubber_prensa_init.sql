-- =====================================================================
-- Migration: Schema apont_rubber_prensa
-- Descrição: Sistema de apontamento industrial para prensas de vulcanização
-- Schema: apont_rubber_prensa
-- =====================================================================

-- 1. Criar o schema
CREATE SCHEMA IF NOT EXISTS apont_rubber_prensa;

-- =====================================================================
-- TABELAS DE CADASTRO (Lógica Estática)
-- =====================================================================

-- Cadastro de máquinas
CREATE TABLE apont_rubber_prensa.maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    num_maq TEXT UNIQUE NOT NULL,
    nome TEXT,
    setor TEXT,
    qtd_platos INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela auxiliar: override manual de tempos (opcional, prioridade sobre Datasul)
CREATE TABLE apont_rubber_prensa.config_engenharia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_item TEXT UNIQUE NOT NULL,
    tempo_ciclo_ideal_segundos INTEGER NOT NULL DEFAULT 300,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- VIEW de produtos (leitura direta do Datasul)
-- Tempo de ciclo = (tempo_maquin * cavidades + tempo_homem) em minutos → segundos
-- Fonte: datasul.operacao filtrada por descricao = 'VULCANIZACAO'
DROP VIEW IF EXISTS apont_rubber_prensa.vw_produtos_datasul;
CREATE VIEW apont_rubber_prensa.vw_produtos_datasul AS
SELECT
    i.it_codigo AS codigo_item,
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
    AND UPPER(TRIM(op.descricao)) = 'VULCANIZACAO'
LEFT JOIN apont_rubber_prensa.config_engenharia ce ON i.it_codigo = ce.codigo_item;

-- VIEW de operadores (leitura direta do Datasul)
CREATE OR REPLACE VIEW apont_rubber_prensa.vw_operadores_datasul AS
SELECT
    f.cdn_funcionario AS matricula,
    f.nom_pessoa_fisic AS nome
FROM datasul.funcionario f;

-- =====================================================================
-- TABELAS DE OPERAÇÃO (Lógica Dinâmica)
-- =====================================================================

-- Sessões de produção
CREATE TABLE apont_rubber_prensa.sessoes_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES apont_rubber_prensa.maquinas(id),
    produto_codigo TEXT NOT NULL,
    plato INTEGER NOT NULL DEFAULT 1,
    operador_matricula TEXT NOT NULL,
    inicio_sessao TIMESTAMPTZ DEFAULT NOW(),
    fim_sessao TIMESTAMPTZ,
    status TEXT DEFAULT 'em_andamento',
    total_refugo INTEGER DEFAULT 0
);

-- Pulsos de produção (cada linha = 1 pulso do CLP)
CREATE TABLE apont_rubber_prensa.pulsos_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID REFERENCES apont_rubber_prensa.sessoes_producao(id),
    timestamp_ciclo TIMESTAMPTZ NOT NULL,
    qtd_pecas INTEGER NOT NULL,
    intervalo_segundos INTEGER,
    mariadb_id TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para evitar duplicatas de sincronização
CREATE UNIQUE INDEX idx_pulsos_mariadb_id ON apont_rubber_prensa.pulsos_producao(mariadb_id);

-- =====================================================================
-- TABELAS DE PERDA E INTEGRAÇÃO
-- =====================================================================

-- Paradas de máquina
CREATE TABLE apont_rubber_prensa.paradas_maquina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES apont_rubber_prensa.maquinas(id),
    sessao_id UUID REFERENCES apont_rubber_prensa.sessoes_producao(id),
    inicio_parada TIMESTAMPTZ NOT NULL,
    fim_parada TIMESTAMPTZ,
    motivo_id TEXT,
    classificacao TEXT,
    justificada BOOLEAN DEFAULT false
);

-- Fila de exportação para o Datasul
CREATE TABLE apont_rubber_prensa.export_datasul (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID REFERENCES apont_rubber_prensa.sessoes_producao(id),
    data_finalizacao TIMESTAMPTZ DEFAULT NOW(),
    item_codigo TEXT,
    quantidade_total INTEGER,
    status_importacao TEXT DEFAULT 'pendente',
    log_erro TEXT
);

-- =====================================================================
-- TABELA DE CONTROLE DO SYNC (Resiliência do Cron)
-- =====================================================================

CREATE TABLE apont_rubber_prensa.sync_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    ultimo_mariadb_id INTEGER NOT NULL DEFAULT 0,
    ultima_sincronizacao TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Inicializa com ID 0
INSERT INTO apont_rubber_prensa.sync_state (id, ultimo_mariadb_id) VALUES (1, 0);

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================

ALTER TABLE apont_rubber_prensa.maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE apont_rubber_prensa.config_engenharia ENABLE ROW LEVEL SECURITY;
ALTER TABLE apont_rubber_prensa.sessoes_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE apont_rubber_prensa.pulsos_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE apont_rubber_prensa.paradas_maquina ENABLE ROW LEVEL SECURITY;
ALTER TABLE apont_rubber_prensa.export_datasul ENABLE ROW LEVEL SECURITY;
ALTER TABLE apont_rubber_prensa.sync_state ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura para usuários autenticados
CREATE POLICY "authenticated_read_maquinas" ON apont_rubber_prensa.maquinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_config" ON apont_rubber_prensa.config_engenharia FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_sessoes" ON apont_rubber_prensa.sessoes_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_pulsos" ON apont_rubber_prensa.pulsos_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_paradas" ON apont_rubber_prensa.paradas_maquina FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_export" ON apont_rubber_prensa.export_datasul FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_sync" ON apont_rubber_prensa.sync_state FOR SELECT TO authenticated USING (true);

-- Políticas de escrita para usuários autenticados (operadores)
CREATE POLICY "authenticated_insert_sessoes" ON apont_rubber_prensa.sessoes_producao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_sessoes" ON apont_rubber_prensa.sessoes_producao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_update_paradas" ON apont_rubber_prensa.paradas_maquina FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_insert_export" ON apont_rubber_prensa.export_datasul FOR INSERT TO authenticated WITH CHECK (true);

-- Políticas para service_role (Cron de sincronização)
CREATE POLICY "service_all_pulsos" ON apont_rubber_prensa.pulsos_producao FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sync" ON apont_rubber_prensa.sync_state FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_paradas" ON apont_rubber_prensa.paradas_maquina FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================================
-- PERMISSÕES GERAIS (GRANTs)
-- Necessárias para schemas customizados no Supabase API
-- =====================================================================

GRANT USAGE ON SCHEMA apont_rubber_prensa TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA apont_rubber_prensa TO authenticated, anon;
GRANT INSERT, UPDATE ON apont_rubber_prensa.sessoes_producao TO authenticated;
GRANT INSERT, UPDATE ON apont_rubber_prensa.paradas_maquina TO authenticated;
GRANT INSERT ON apont_rubber_prensa.export_datasul TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA apont_rubber_prensa TO authenticated, anon;

-- =====================================================================
-- REGISTRO DO APP NO PORTAL
-- =====================================================================

INSERT INTO public.apps (code, name, description, active)
VALUES ('apont_rubber_prensa', 'Apontamento Prensa', 'Apontamento de produção das prensas de vulcanização', true)
ON CONFLICT (code) DO NOTHING;
