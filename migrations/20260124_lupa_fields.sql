-- Adiciona campos para o fluxo de Avaliação Lupa (Adesivo)

ALTER TABLE app_controle_prazo_qualidade.production_items 
ADD COLUMN IF NOT EXISTS op_number bigint,
ADD COLUMN IF NOT EXISTS lupa_evaluator text,
ADD COLUMN IF NOT EXISTS lupa_operator text,
ADD COLUMN IF NOT EXISTS lupa_status_start text DEFAULT 'APPROVED' CHECK (lupa_status_start IN ('APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS lupa_status_end text DEFAULT 'APPROVED' CHECK (lupa_status_end IN ('APPROVED', 'REJECTED'));

-- Comentários
COMMENT ON COLUMN app_controle_prazo_qualidade.production_items.op_number IS 'Número da OP (Ordem de Produção)';
COMMENT ON COLUMN app_controle_prazo_qualidade.production_items.lupa_evaluator IS 'Código do Avaliador (Início do Processo / Lupa)';
COMMENT ON COLUMN app_controle_prazo_qualidade.production_items.lupa_operator IS 'Código do Operador (Fim do Processo)';
