-- Upgrade Script: Initialize User Preferences (Theme)
-- Run this in Supabase SQL Editor

-- Insert default user preferences if not exists
INSERT INTO settings (key, value)
VALUES (
  'user_preferences', 
  '{"theme_color": "theme-zinc", "theme_mode": "system"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
