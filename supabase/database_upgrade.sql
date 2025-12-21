-- Upgrade script to add V3 support to character_cards table
-- Run this in your Supabase SQL Editor

-- Add JSONB column to store the full V3 data structure
-- This allows storing character_book (World Info), regex_scripts, and other nested data without complex schema changes
ALTER TABLE character_cards 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN character_cards.data IS 'Stores the full V3 character data object including character_book and extensions';

-- Create an index on the data column for better performance if querying inside JSON
CREATE INDEX IF NOT EXISTS idx_character_cards_data ON character_cards USING gin (data);

-- Optional: Add specific columns if you want to query them directly without JSON operators
-- ALTER TABLE character_cards ADD COLUMN IF NOT EXISTS system_prompt TEXT;
-- ALTER TABLE character_cards ADD COLUMN IF NOT EXISTS post_history_instructions TEXT;
