-- ==============================================================================
-- MIGRATION: App Anotações (Init)
-- Description: Criação do schema e tabela de notas com segurança RLS.
-- Author: Antigravity (Database Architect Agent)
-- Date: 2026-01-23
-- ==============================================================================

-- 1. Criar Schema Isolado
CREATE SCHEMA IF NOT EXISTS app_anotacoes;

-- 2. Tabela de Notas (Notes)
CREATE TABLE IF NOT EXISTS app_anotacoes.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Sem Título',
    
    -- O 'canvas_data' armazena o estado completo do Tldraw (JSON)
    -- Tipo JSONB é crucial para performance e indexação se necessário no futuro
    canvas_data JSONB,
    
    preview_image TEXT, -- URL base64 ou link storage da miniatura
    is_favorite BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices Estratégicos (Performance)
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON app_anotacoes.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON app_anotacoes.notes(updated_at DESC);

-- 4. Função para Atualizar 'updated_at' Automaticamente
CREATE OR REPLACE FUNCTION app_anotacoes.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notes_timestamp
BEFORE UPDATE ON app_anotacoes.notes
FOR EACH ROW
EXECUTE FUNCTION app_anotacoes.handle_updated_at();

-- 5. Segurança (RLS - Row Level Security)
ALTER TABLE app_anotacoes.notes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem suas próprias notas
CREATE POLICY "Users can view own notes" 
ON app_anotacoes.notes FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Usuários inserem apenas suas próprias notas
CREATE POLICY "Users can insert own notes" 
ON app_anotacoes.notes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários editam apenas suas próprias notas
CREATE POLICY "Users can update own notes" 
ON app_anotacoes.notes FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Usuários deletam apenas suas próprias notas
CREATE POLICY "Users can delete own notes" 
ON app_anotacoes.notes FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 6. Permissões de Acesso (Grants)
-- Permitir que a role 'authenticated' (O app logado) acesse o schema e tabelas
GRANT USAGE ON SCHEMA app_anotacoes TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA app_anotacoes TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_anotacoes TO authenticated, anon;

-- ==============================================================================
-- FIM DA MIGRAÇÃO
-- ==============================================================================
