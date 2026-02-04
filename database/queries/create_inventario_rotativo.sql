-- Tabela para o Inventário Rotativo
CREATE TABLE public.inventario_rotativo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  it_codigo TEXT NOT NULL,
  qtd_fisica NUMERIC[] DEFAULT '{}', -- Array para armazenar histórico de contagens (ex: {10, 12, 12})
  contado BOOLEAN DEFAULT FALSE,
  centro_custo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index para performance (opcional, bom para filtros por CC ou Item)
CREATE INDEX idx_inventario_cc ON public.inventario_rotativo(centro_custo);
CREATE INDEX idx_inventario_item ON public.inventario_rotativo(it_codigo);

-- Registrar o App
INSERT INTO public.apps (code, name, description, active)
VALUES (
  'inventario_rotativo', 
  'Inventário Rotativo', 
  'App de contagem cíclica com histórico de conferências', 
  true
) ON CONFLICT (code) DO NOTHING;

-- Policies (RLS) - Exemplo básico (ajustar conforme necessidade de segurança)
ALTER TABLE public.inventario_rotativo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para usuários autenticados" ON public.inventario_rotativo
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir insert/update para usuários autenticados" ON public.inventario_rotativo
FOR ALL TO authenticated USING (true);
