-- Store OAuth tokens and dynamic client registration for Granola MCP integration
CREATE TABLE granola_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  client_id TEXT,
  client_secret TEXT,
  code_verifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only access their own tokens
ALTER TABLE granola_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Granola tokens"
  ON granola_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
