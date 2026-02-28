-- Renomeia a coluna total_refugo para qtd_produzida na tabela sessoes_producao
-- qtd_produzida armazena o total acumulado de peças produzidas na sessão (atualizado a cada ciclo)
ALTER TABLE apont_rubber_prensa.sessoes_producao 
  RENAME COLUMN total_refugo TO qtd_produzida;

ALTER TABLE apont_rubber_prensa.sessoes_producao 
  ALTER COLUMN qtd_produzida SET DEFAULT 0;

-- Adiciona coluna operador_matricula na export_datasul para rastreabilidade
ALTER TABLE apont_rubber_prensa.export_datasul
  ADD COLUMN IF NOT EXISTS operador_matricula TEXT;
