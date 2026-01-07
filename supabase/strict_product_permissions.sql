-- STRICT PRODUCT PERMISSIONS (Admin ONLY)
-- This script removes Seller write permissions on the products table.

-- 1. Drop existing "Admin + Seller" policies
DROP POLICY IF EXISTS "admin_seller_insert_products" ON products;
DROP POLICY IF EXISTS "admin_seller_update_products" ON products;
DROP POLICY IF EXISTS "admin_seller_delete_products" ON products;

-- 2. Create "Admin ONLY" policies for write operations
-- We use get_my_claim_role() if available (from previous fix), or fallback to direct check if need be.
-- Assuming get_my_claim_role() exists from MASTER_BUG_FIX.sql

CREATE POLICY "admin_only_insert_products"
ON products FOR INSERT TO authenticated
WITH CHECK ( get_my_claim_role() = 'admin' );

CREATE POLICY "admin_only_update_products"
ON products FOR UPDATE TO authenticated
USING ( get_my_claim_role() = 'admin' )
WITH CHECK ( get_my_claim_role() = 'admin' );

CREATE POLICY "admin_only_delete_products"
ON products FOR DELETE TO authenticated
USING ( get_my_claim_role() = 'admin' );

-- 3. Ensure "Public Read" or "Authenticated Read" still exists
-- (Usually handled by 'public_read_products' or similar. We won't touch read policies unless missing)
-- Just in case, ensuring authenticated users (including sellers) can READ:
DROP POLICY IF EXISTS "authenticated_read_products" ON products;
CREATE POLICY "authenticated_read_products"
ON products FOR SELECT TO authenticated
USING (true);

-- Verification
SELECT * FROM pg_policies WHERE tablename = 'products';
