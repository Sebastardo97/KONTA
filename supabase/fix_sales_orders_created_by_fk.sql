-- Fix sales_orders created_by Foreign Key to point to profiles
-- This is required for the API to fetch 'created_by_user' profile details

BEGIN;

-- 1. Check if the specific FK name we use in frontend exists, if not, create it.
-- Constraint name: sales_orders_created_by_fkey

DO $$
BEGIN
    -- Only add if it doesn't exist to avoid errors
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_orders_created_by_fkey' 
        AND table_name = 'sales_orders'
    ) THEN
        ALTER TABLE sales_orders
        ADD CONSTRAINT sales_orders_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES profiles(id)
        ON DELETE RESTRICT;  -- or SET NULL, but created_by is NOT NULL usually
    END IF;
END $$;

-- 2. Ensure RLS on sales_orders allows SELECT for sellers for their own orders
-- (Just in case the previous policy creation was missed or malformed)
DROP POLICY IF EXISTS "Sellers can see assigned orders" ON sales_orders;

CREATE POLICY "Sellers can see assigned orders"
  ON sales_orders
  FOR SELECT
  USING (
    -- Allow if user is seller AND assigned_to is them
    (auth.uid() = assigned_to) 
    -- OR if user is admin (covered by other policy, but safe to add fallback)
    OR 
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  );

COMMIT;

-- Verify
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
WHERE conname = 'sales_orders_created_by_fkey';
