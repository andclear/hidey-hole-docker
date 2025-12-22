import re

def process_schema():
    with open('supabase/clean_public_schema.sql', 'r') as f:
        content = f.read()

    # 1. Schema creation
    content = re.sub(
        r'CREATE SCHEMA public;',
        'CREATE SCHEMA IF NOT EXISTS public;',
        content
    )

    # 2. Extension creation
    # Check if UUID extension is present, if not add it safely
    if 'uuid-ossp' not in content:
        # Add after schema comment
        content = re.sub(
            r"(COMMENT ON SCHEMA public IS 'standard public schema';)",
            r"\1\n\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\" WITH SCHEMA extensions;",
            content
        )
    else:
        content = re.sub(
            r'CREATE EXTENSION "uuid-ossp"',
            'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
            content
        )

    # 3. Table creation
    content = re.sub(
        r'CREATE TABLE public\.(\w+)',
        r'CREATE TABLE IF NOT EXISTS public.\1',
        content
    )

    # 4. Constraint creation (Primary Keys and Foreign Keys are usually added via ALTER TABLE in dumps)
    # We need to wrap ALTER TABLE ... ADD CONSTRAINT in DO blocks to avoid errors if they exist
    
    # Regex to match ALTER TABLE ... ADD CONSTRAINT block
    # This captures:
    # 1: Table name
    # 2: Constraint name
    # 3: The rest of the constraint definition
    constraint_pattern = r'ALTER TABLE ONLY public\.(\w+)\s+ADD CONSTRAINT (\w+) (.*?);'
    
    def replace_constraint(match):
        table_name = match.group(1)
        constraint_name = match.group(2)
        definition = match.group(3)
        return f"""DO 29178 BEGIN
    ALTER TABLE ONLY public.{table_name}
    ADD CONSTRAINT {constraint_name} {definition};
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN invalid_table_definition THEN NULL;
END 29178;"""

    content = re.sub(constraint_pattern, replace_constraint, content, flags=re.DOTALL)

    # 5. Index creation
    content = re.sub(
        r'CREATE INDEX (\w+)',
        r'CREATE INDEX IF NOT EXISTS \1',
        content
    )
    
    content = re.sub(
        r'CREATE UNIQUE INDEX (\w+)',
        r'CREATE UNIQUE INDEX IF NOT EXISTS \1',
        content
    )

    # 6. Policies
    # Wrap CREATE POLICY in DO blocks
    # Pattern: CREATE POLICY "name" ON table ...;
    policy_pattern = r'CREATE POLICY "([^"]+)" ON public\.(\w+) (.*?);'
    
    def replace_policy(match):
        policy_name = match.group(1)
        table_name = match.group(2)
        definition = match.group(3)
        return f"""DO 29178 BEGIN
    CREATE POLICY "{policy_name}" ON public.{table_name} {definition};
EXCEPTION
    WHEN duplicate_object THEN NULL;
END 29178;"""

    content = re.sub(policy_pattern, replace_policy, content, flags=re.DOTALL)

    with open('supabase/migrations/schema.sql', 'w') as f:
        f.write(content)

if __name__ == '__main__':
    process_schema()
