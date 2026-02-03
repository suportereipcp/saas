-- Add approval columns to layer_control_records
ALTER TABLE app_controle_prazo_qualidade.layer_control_records
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
