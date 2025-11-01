-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_api_key_id ON messages(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE active = true;

-- Full-text search on content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

-- Trigram index for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_messages_content_trgm ON messages USING gin(content gin_trgm_ops);

-- Row-level security (optional for v0, but good practice)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Public read access for messages
CREATE POLICY messages_public_read ON messages
  FOR SELECT
  USING (true);

-- Only allow authenticated API keys to insert
CREATE POLICY messages_authenticated_insert ON messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE id = api_key_id AND active = true
    )
  );

-- Function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'amcp_';
  random_part TEXT;
BEGIN
  -- Generate a 32-character random string
  random_part := encode(gen_random_bytes(24), 'base64');
  random_part := REPLACE(random_part, '/', '_');
  random_part := REPLACE(random_part, '+', '-');
  random_part := REPLACE(random_part, '=', '');
  RETURN prefix || random_part;
END;
$$ LANGUAGE plpgsql;

-- View for message stats (optional)
CREATE OR REPLACE VIEW message_stats AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS message_count,
  COUNT(DISTINCT api_key_id) AS unique_agents
FROM messages
GROUP BY hour
ORDER BY hour DESC;
