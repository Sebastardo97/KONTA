-- Fix sales_orders foreign keys to point to profiles for easier API access
BEGIN;

-- 1. Drop existing FK to auth.users if it exists (constraint name might vary, trying common ones)
-- We will just add a new one to profiles, or replace it.
-- Postgres allows multiple FKs on same column, but better to have one semantic one for API.

-- Try to find and drop existing constraint
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.table_constraints 
             WHERE table_name = 'sales_orders' 
             AND constraint_type = 'FOREIGN KEY' 
             AND constraint_name LIKE '%assigned_to%'
    LOOP
        EXECUTE 'ALTER TABLE sales_orders DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 2. Add FK to profiles
ALTER TABLE sales_orders
ADD CONSTRAINT sales_orders_assigned_to_profiles_fkey
FOREIGN KEY (assigned_to)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- 3. Also fix created_by to point to profiles if useful (usually admin)
-- But created_by is NOT null, so might block if profile doesn't exist.
-- Let's stick to assigned_to first.

COMMIT;

-- Verify
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'sales_orders'::regclass
AND conname LIKE '%profiles%';
