-- Migration: Consolidate 'anotacoes' app record
-- Author: Antigravity
-- Date: 2026-01-26
-- Description: Removes the temporary 'app_anotacoes' and ensures 'anotacoes' exists as "Caderno Inteligente".

-- 1. Remove the incorrectly named record (if exists)
DELETE FROM public.apps WHERE code = 'app_anotacoes';

-- 2. Insert/Update the correct record
INSERT INTO public.apps (code, name, description, active)
VALUES (
    'anotacoes',
    'Caderno Inteligente',
    'Caderno inteligente com assistente de IA, transcrição e busca semântica.',
    true
)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;
