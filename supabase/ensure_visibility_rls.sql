-- Ensure Sellers can VIEW Profiles and Customers to see Order Details

-- 1. Profiles: Allow reading all profiles (needed to see who the seller is, or who created the order)
BEGIN;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can select profiles" ON profiles;

CREATE POLICY "Authenticated users can select profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Customers: Allow reading all customers (needed to see who the customer is)
-- If you have strict customer separation, change this. But for now, sellers need to see customers.
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON customers;

CREATE POLICY "Enable read access for authenticated users"
  ON customers FOR SELECT
  USING (auth.role() = 'authenticated');

COMMIT;
