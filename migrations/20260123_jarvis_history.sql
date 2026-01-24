-- Create chat message history table
CREATE TABLE IF NOT EXISTS app_anotacoes.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_anotacoes.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own chat history"
    ON app_anotacoes.chat_messages
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
    ON app_anotacoes.chat_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- System function to insert model messages (triggered via API with service role or same user flow)
-- For now, API will duplicate the user_id context, so we just need standard INSERT policy.

-- Index for performance (sorting by date)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created 
ON app_anotacoes.chat_messages(user_id, created_at DESC);
