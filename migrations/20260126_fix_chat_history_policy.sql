-- Fix Chat History Visibility
-- The backend uses Service Role (bypassing RLS), but the Frontend uses User Token (subject to RLS).
-- We need to ensure users can SELECT their own messages.

-- 1. Ensure RLS is enabled
ALTER TABLE app_anotacoes.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Add/Update SELECT Policy
DROP POLICY IF EXISTS "Users can view their own chat messages" ON app_anotacoes.chat_messages;

CREATE POLICY "Users can view their own chat messages"
ON app_anotacoes.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Just in case, ensure INSERT policy exists if we ever want to insert from frontend (optional but good practice)
-- Currently frontend calls API, but if we change logic:
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON app_anotacoes.chat_messages;

CREATE POLICY "Users can insert their own chat messages"
ON app_anotacoes.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);
