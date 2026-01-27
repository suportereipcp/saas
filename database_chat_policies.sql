-- DOCUMENTATION: Chat Module Security Policies
-- Created: 2026-01-26
-- Context: Fix visibility of chat history in Frontend (User context) vs Backend (Service Role)

-- 1. Enable RLS on chat_messages table
ALTER TABLE app_anotacoes.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Users can VIEW their own messages
-- Used by: Frontend (Assistente) to load history
CREATE POLICY "Users can view their own chat messages"
ON app_anotacoes.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Policy: Users can INSERT their own messages
-- Used by: Frontend (if direct insert is enabled) or future-proofing
CREATE POLICY "Users can insert their own chat messages"
ON app_anotacoes.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Note: The backend API (route.ts) uses supabaseAdmin (Service Role) which bypasses these policies.
