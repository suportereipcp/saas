-- Adiciona campos para controle de transferência de entrada

ALTER TABLE app_controle_prazo_qualidade.production_items 
ADD COLUMN IF NOT EXISTS transfer_status text DEFAULT 'PENDING' CHECK (transfer_status IN ('PENDING', 'TRANSFERRED', 'EVALUATION')),
ADD COLUMN IF NOT EXISTS transfer_note text,
ADD COLUMN IF NOT EXISTS transfer_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS transfer_updated_by text;

-- Index para performance no filtro
CREATE INDEX IF NOT EXISTS idx_production_items_transfer_status ON app_controle_prazo_qualidade.production_items(transfer_status);

-- Comentários
COMMENT ON COLUMN app_controle_prazo_qualidade.production_items.transfer_status IS 'Status de transferência logística: PENDING, TRANSFERRED, EVALUATION';
