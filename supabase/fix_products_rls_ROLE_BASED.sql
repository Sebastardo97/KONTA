-- PRODUCTION-READY RLS Policies for Products
-- Only ADMIN and SELLER roles can manage products

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "All authenticated can read products" ON products;
DROP POLICY IF EXISTS "Authenticated delete products" ON products;
DROP POLICY IF EXISTS "Authenticated insert products" ON products;
DROP POLICY IF EXISTS "Authenticated update products" ON products;
DROP POLICY IF EXISTS "Only admins can delete products" ON products;
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can update products" ON products;
DROP POLICY IF EXISTS "Public read access" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;
DROP POLICY IF EXISTS "anyone_select_products" ON products;
DROP POLICY IF EXISTS "auth_insert_products" ON products;
DROP POLICY IF EXISTS "auth_update_products" ON products;
DROP POLICY IF EXISTS "auth_delete_products" ON products;

-- Step 2: Create PUBLIC READ policy (anyone can see products)
CREATE POLICY "public_read_products"
ON products FOR SELECT
TO public
USING (true);

-- Step 3: Create ROLE-BASED policies for INSERT, UPDATE, DELETE
-- Only users with role 'admin' or 'seller' can manage products

CREATE POLICY "admin_seller_insert_products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'seller')
  )
);

CREATE POLICY "admin_seller_update_products"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'seller')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'seller')
  )
);

CREATE POLICY "admin_seller_delete_products"
ON products FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'seller')
  )
);

-- Step 4: Ensure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify your user has the correct role
-- Run this to check your role:
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- Step 6: Verify all policies are correct
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;
