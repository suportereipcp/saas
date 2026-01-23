-- ==============================================================================
-- MIGRATION: App Anotações - Marcadores (Markers)
-- Description: Tabela para gerenciar Pessoas e Tópicos dinamicamente.
-- Author: Antigravity
-- ==============================================================================

-- 1. Criação da Tabela 'markers'
CREATE TABLE IF NOT EXISTS app_anotacoes.markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PERSON', 'TOPIC')), -- 'PERSON' ou 'TOPIC'
    avatar_url TEXT, -- Para foto de perfil ou ícone
    
    -- Metadados opcionais (Cargo, items relacionados)
    metadata JSONB DEFAULT '{}', 
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Segurança (RLS)
ALTER TABLE app_anotacoes.markers ENABLE ROW LEVEL SECURITY;

-- Policy: Todos autenticados podem LER (para aparecer no modal)
CREATE POLICY "Authenticated can view markers" 
ON app_anotacoes.markers FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Apenas Admins podem criar/editar (Simplificado: todos autenticados por enquanto)
-- Idealmente, restringiríamos isso a um role de admin/gestor.
CREATE POLICY "Authenticated can manage markers" 
ON app_anotacoes.markers FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Seed Inicial (Removido a pedido do usuário)
-- A tabela inicia vazia. Os marcadores devem ser criados via aplicação ou admin.

-- 4. Permissões
GRANT ALL ON app_anotacoes.markers TO authenticated, anon;
