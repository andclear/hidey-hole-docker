-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  card_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Character Cards Table
CREATE TABLE IF NOT EXISTS character_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_hash TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  name TEXT NOT NULL,
  description TEXT,
  personality TEXT,
  scenario TEXT,
  first_message TEXT,
  creator_notes TEXT,
  ai_summary TEXT,
  ai_tags TEXT[],
  category_id UUID REFERENCES categories(id),
  user_rating INTEGER,
  rating_dimensions JSONB,
  user_notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  play_count INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tags Table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Card Tags Association Table
CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  is_manual BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (card_id, tag_id)
);

-- 5. Collections Table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cover_card_id UUID REFERENCES character_cards(id),
  is_smart BOOLEAN DEFAULT FALSE,
  smart_filter JSONB,
  card_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Collection Cards Association Table
CREATE TABLE IF NOT EXISTS collection_cards (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, card_id)
);

-- 7. Play Sessions Table
CREATE TABLE IF NOT EXISTS play_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER,
  model_used TEXT,
  api_provider TEXT,
  rating INTEGER,
  mood TEXT,
  notes TEXT,
  screenshots TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Card Versions Table
CREATE TABLE IF NOT EXISTS card_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  main_card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE,
  version_card_id UUID REFERENCES character_cards(id) ON DELETE CASCADE,
  version_name TEXT,
  version_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create default 'Uncategorized' category if not exists
INSERT INTO categories (name, description, sort_order)
SELECT '未分类', '默认分类', 999
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '未分类');

-- Enable RLS for character_cards (and others if needed)
ALTER TABLE character_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for service role" ON character_cards TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable read access for all users" ON character_cards FOR SELECT USING (true);
