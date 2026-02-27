CREATE TABLE IF NOT EXISTS apont_rubber_prensa.alertas_maquina (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maquina_id uuid NOT NULL REFERENCES apont_rubber_prensa.maquinas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  resolvido boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilita o RLS
ALTER TABLE apont_rubber_prensa.alertas_maquina ENABLE ROW LEVEL SECURITY;

-- Cria política global
CREATE POLICY "Enable read/write on alertas_maquina" ON apont_rubber_prensa.alertas_maquina
  FOR ALL USING (true);
