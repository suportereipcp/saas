-- Adiciona a coluna centro_custo como um array de texto para permitir múltiplos valores
-- Exemplo de uso: ARRAY['9999999', '8888888']
ALTER TABLE public.profiles
ADD COLUMN centro_custo text[] DEFAULT NULL;

-- Opcional: Adicionar comentário para documentação
COMMENT ON COLUMN public.profiles.centro_custo IS 'Lista de centros de custo associados ao usuário (ex: 9999999)';
