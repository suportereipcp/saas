-- ==============================================================================
-- Migration: Cadastro de Motivos de Parada
-- Schema: apont_rubber_prensa
-- Data: 2026-02-27
-- ==============================================================================

-- 1. Cria a Tabela de Motivos
CREATE TABLE IF NOT EXISTS apont_rubber_prensa.cad_motivos_parada (
  id TEXT PRIMARY KEY, -- Ex: '10', '20', etc
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita RLS (Row Level Security)
ALTER TABLE apont_rubber_prensa.cad_motivos_parada ENABLE ROW LEVEL SECURITY;

-- 3. Cria Políticas de Acesso
CREATE POLICY "Leitura irrestrita para motivos ativos"
  ON apont_rubber_prensa.cad_motivos_parada
  FOR SELECT
  USING (ativo = true);

-- Políticas para usuários autenticados (Gestão)
CREATE POLICY "Gestão total de motivos"
  ON apont_rubber_prensa.cad_motivos_parada
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Insere a Carga Inicial Padrão solicitada
INSERT INTO apont_rubber_prensa.cad_motivos_parada (id, descricao, ativo)
VALUES 
  ('10', 'Almoço / Janta', true),
  ('20', 'Café / Ginástica / Banheiro', true),
  ('30', 'Manutenção', true),
  ('40', 'Falta de energia', true),
  ('50', 'Peça com defeito', true),
  ('60', 'Setup', true),
  ('70', 'Aguardando Material', true),
  ('00', 'Encerramento Automático (Sistema)', false) -- False para não aparecer como opção no Tablet
ON CONFLICT (id) DO UPDATE 
SET descricao = EXCLUDED.descricao;
