-- 安全策略与逻辑补丁 (Secure & Logic Patch)
-- 该文件由自动化脚本执行，必须保证幂等性 (Idempotent)

-- 1. 开启 RLS (Row Level Security)
-- Prisma 无法管理 RLS，必须手动开启
DO $$ 
BEGIN
    ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.character_cards ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN NULL;
END $$;


-- 2. 创建 RLS 策略 (Policies)
-- 策略: 允许所有用户读取 (SELECT)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'card_history' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.card_history FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'character_cards' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.character_cards FOR SELECT USING (true);
    END IF;
END $$;


-- 策略: 允许 Service Role (后端管理员) 完全访问
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'card_history' AND policyname = 'Enable all access for service role'
    ) THEN
        CREATE POLICY "Enable all access for service role" ON public.card_history TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'character_cards' AND policyname = 'Enable all access for service role'
    ) THEN
        CREATE POLICY "Enable all access for service role" ON public.character_cards TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. 其他约束 (Constraints)
-- 原始 SQL 中没有特殊的 CHECK 约束，如果有，应按以下格式添加:
/*
DO $$
BEGIN
    ALTER TABLE public.table_name ADD CONSTRAINT constraint_name CHECK (expression);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
*/

-- 4. 触发器与函数 (Triggers & Functions)
-- 原始 SQL 中没有自定义触发器，如果有，应按以下格式添加:
/*
CREATE OR REPLACE FUNCTION public.function_name() RETURNS trigger AS $$
BEGIN
    -- ... logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_name ON public.table_name;
CREATE TRIGGER trigger_name
    BEFORE UPDATE ON public.table_name
    FOR EACH ROW EXECUTE FUNCTION public.function_name();
*/
