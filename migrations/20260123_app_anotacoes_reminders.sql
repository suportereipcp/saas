-- ==============================================================================
-- MIGRATION: App Anotações - Lembretes (Reminders)
-- Description: Tabela para o calendário.
-- Author: Antigravity
-- ==============================================================================

CREATE TABLE IF NOT EXISTS app_anotacoes.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- user_id opcional por enquanto, mas recomendado para multi-tenancy futuro
    -- user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, 
    
    date TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE app_anotacoes.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage reminders" 
ON app_anotacoes.reminders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Permissões
GRANT ALL ON app_anotacoes.reminders TO authenticated, anon;
