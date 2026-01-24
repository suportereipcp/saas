-- ==============================================================================
-- MIGRATION: App Anotações - Add Transcription
-- Description: Adiciona coluna para texto transcrito/resumo.
-- Author: Antigravity
-- ==============================================================================

ALTER TABLE app_anotacoes.notes 
ADD COLUMN IF NOT EXISTS transcription TEXT;
v