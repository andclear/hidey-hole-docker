import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
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

-- Enable RLS (Row Level Security) - though we are using single user admin mode, 
-- it's good practice. Since we use service role key for everything backend, 
-- and frontend is read-only for public (if we wanted) or protected by app auth.
-- For now, we can leave RLS off or enable it and create a policy that allows everything for service_role.

ALTER TABLE character_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for service role" ON character_cards TO service_role USING (true) WITH CHECK (true);
-- (Repeat for other tables if strict security is needed, but for local single user app, we can skip complex RLS for now)
`;

async function runMigration() {
  console.log('Starting database migration...');
  
  // Split SQL by semicolon to run statements individually (Supabase RPC might handle block, but simple query might not)
  // Actually supabase-js doesn't have a direct 'query' method for raw SQL unless we use RPC or an edge function.
  // HOWEVER, the standard supabase-js client DOES NOT support raw SQL execution directly from the client 
  // without a stored procedure (RPC) created first.
  
  // Since we don't have an RPC 'exec_sql' yet, we are in a chicken-and-egg situation.
  // BUT, I can try to use the PostgreSQL connection string if I had it.
  // I only have the HTTP URL.
  
  // ALTERNATIVE: Use the 'pg' library if I had the connection string. I don't.
  
  // WAIT. The user provided 'SUPABASE_SERVICE_ROLE_KEY'. 
  // If this is a local Supabase (as indicated by IP 192.168.31.213), maybe I can assume standard postgres ports?
  // But I shouldn't guess.
  
  // Let's try to use the 'rpc' method. 
  // Usually local supabase has a built-in function or I can try to create one? No.
  
  // Let's look at the docs or context. The user provided 'docs/项目开发文档.md'.
  // It doesn't mention how to run migrations.
  
  // If I cannot run raw SQL via supabase-js, I have a problem.
  // Standard way: use the Supabase dashboard SQL editor.
  
  // However, I have `mcp_supabase-local_execute_sql`. I tried it and it failed with auth error.
  // This was because the MCP tool didn't have the password. 
  // The user provided ADMIN_PASSWORD in .env. Is that for the APP or the DB?
  // "ADMIN_PASSWORD=liuqicheng520" -> "Auth (必需 - 管理员单用户认证)". likely App admin.
  // Supabase DB password is usually different.
  
  // BUT, usually `npx supabase start` outputs the DB URL.
  // I don't have that.
  
  // Let's try to use a VERY hacky way if supabase-js doesn't support it?
  // Actually, wait. I am an AI. I can just instruct the user to run the SQL?
  // No, I should try to automate.
  
  // Let's re-read the Supabase MCP error: 
  // "password authentication failed for user 'supabase_read_only_user'".
  // This MCP tool seems configured to use a specific user.
  
  // Let's try to write the SQL to a file `supabase/schema.sql` and ask the user to run it?
  // OR, I can try to use `postgres` npm package if I can guess the connection string.
  // URL: http://192.168.31.213:18000
  // Standard Postgres port: 5432?
  // Standard Supabase local DB password: 'postgres' or 'password'?
  
  // Let's assume I can't run it automatically for now. 
  // I will write the SQL file and create a simple instruction.
  // AND I will try to create a `scripts/init-db.ts` that *prints* the SQL so the user can copy it easily,
  // OR creates a file.
  
  // Actually, I'll stick to creating `supabase/schema.sql`.
  // AND I will add a step in the UI to help run it? No, UI needs DB to work (mostly).
  
  // Let's create `supabase/schema.sql` first.
}

runMigration();
