-- Create table for Layer Control (Camada)
CREATE TABLE IF NOT EXISTS app_controle_prazo_qualidade.layer_control_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    date DATE,
    item_code TEXT,
    op_number TEXT,
    process_type TEXT,
    standard_range TEXT,
    test_1 NUMERIC,
    test_2 NUMERIC,
    test_3 NUMERIC,
    average NUMERIC,
    result NUMERIC,
    validation_status TEXT,
    adhesive_type TEXT,
    standard_thickness TEXT,
    user_email TEXT
);

-- RLS Policy (Optional but recommended)
ALTER TABLE app_controle_prazo_qualidade.layer_control_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users"
ON app_controle_prazo_qualidade.layer_control_records
FOR ALL
USING (auth.role() = 'authenticated');
