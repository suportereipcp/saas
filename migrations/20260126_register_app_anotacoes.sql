-- Migration: Register 'app_anotacoes' in public.apps
-- Author: Antigravity
-- Date: 2026-01-26

INSERT INTO public.apps (code, name, description, active)
VALUES (
    'app_anotacoes',
    'Anotações (Jarvis)',
    'Caderno inteligente com assistente de IA, transcrição e busca semântica.',
    true
)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;
