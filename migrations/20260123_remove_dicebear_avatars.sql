-- ==============================================================================
-- MIGRATION: Remove Generated Avatars
-- Description: Remove URLs do Dicebear para reverter para ícone padrão.
-- ==============================================================================

UPDATE app_anotacoes.markers 
SET avatar_url = NULL 
WHERE avatar_url LIKE '%api.dicebear.com%';
