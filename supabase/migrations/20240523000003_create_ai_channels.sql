-- Create AI channels table
CREATE TABLE IF NOT EXISTS ai_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT,
    model TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one channel is active (optional, handled by app logic usually, but we can add a constraint or trigger if we really want to be strict. For now, app logic is fine)

-- Migrate existing settings if any
DO $$
DECLARE
    settings_json JSONB;
    ai_config JSONB;
BEGIN
    -- Check if settings table exists and get ai_config
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
        SELECT value INTO settings_json FROM settings WHERE key = 'ai_config';
        
        IF settings_json IS NOT NULL THEN
            -- Check if we already have channels, if not, migrate
            IF NOT EXISTS (SELECT 1 FROM ai_channels) THEN
                 INSERT INTO ai_channels (name, base_url, api_key, model, is_active)
                 VALUES (
                    'Default Channel',
                    COALESCE(settings_json->>'ai_endpoint', 'https://api.openai.com/v1'),
                    settings_json->>'ai_api_key',
                    COALESCE(settings_json->>'ai_model', 'gpt-3.5-turbo'),
                    COALESCE((settings_json->>'ai_enabled')::boolean, false)
                 );
            END IF;
        END IF;
    END IF;
END $$;
