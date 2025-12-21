-- Create regex_rules table for global and card-specific regex rules
CREATE TABLE IF NOT EXISTS regex_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE, -- NULL for global rules
  name TEXT NOT NULL,
  regex TEXT NOT NULL,
  replacement TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE regex_rules IS 'Stores regex rules for chat history sanitization. card_id NULL implies global rule.';

-- Update character_cards table to support S3 folder structure concept implicitly
-- No schema change needed for S3 structure as it's logic-based, but we might want a field for chat_history_path if not using convention
-- For now, we will stick to the convention: {user_id}/{card_id}/...

-- However, for chat history uploads, we need to track them if we want to list them
-- We can add a 'chat_sessions' table to track uploaded history files
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, -- e.g., "session_2023_12_20.jsonl"
  s3_key TEXT NOT NULL, -- Full S3 path e.g., "{user_id}/{card_id}/chat_history/session_xyz.jsonl"
  file_size BIGINT,
  message_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE chat_sessions IS 'Tracks uploaded chat history files for character cards';
