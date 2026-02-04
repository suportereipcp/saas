ALTER TABLE public.inventario_rotativo
ADD COLUMN dt_contagem TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.inventario_rotativo.dt_contagem IS 'Data da última contagem realizada';
