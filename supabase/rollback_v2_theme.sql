-- Rollback Script: Remove User Preferences (Theme)
-- Run this in Supabase SQL Editor

-- Remove the user_preferences entry
DELETE FROM settings WHERE key = 'user_preferences';
