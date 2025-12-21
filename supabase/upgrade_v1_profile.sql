-- Upgrade Script: Initialize User Profile in Settings
-- Run this in Supabase SQL Editor

-- 1. Insert default admin profile if not exists
INSERT INTO settings (key, value)
VALUES (
  'admin_profile', 
  '{"display_name": "Admin", "avatar_url": "", "bio": "Super Administrator"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure settings table exists (in case it wasn't created)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
