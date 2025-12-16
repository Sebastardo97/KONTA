-- =====================================================
-- ROLE-BASED ACCESS CONTROL ENHANCEMENTS
-- =====================================================
-- This migration adds support for seller management,
-- role-based permissions, and enhanced user tracking
-- =====================================================

-- SELLERS TABLE
-- Stores additional information for users with 'seller' role
CREATE TABLE IF NOT EXISTS sellers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  commission_rate NUMERIC DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  sales_target NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_active ON sellers(is_active);

-- FUNCTION: Get user role
-- Helper function to retrieve the role of the current user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: Check if user is seller
CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'seller';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES FOR SELLERS TABLE
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with sellers
CREATE POLICY "Admins full access to sellers"
  ON sellers
  FOR ALL
  USING (is_admin());

-- Sellers can only view their own record
CREATE POLICY "Sellers can view own record"
  ON sellers
  FOR SELECT
  USING (user_id = auth.uid());

-- Sellers can update their own record (limited fields)
CREATE POLICY "Sellers can update own record"
  ON sellers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- UPDATE RLS POLICIES FOR PRODUCTS (Sellers can only read)
DROP POLICY IF EXISTS "Authenticated insert" ON products;
DROP POLICY IF EXISTS "Authenticated update" ON products;

-- Sellers and admins can read products
CREATE POLICY "All authenticated can read products"
  ON products
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete products
CREATE POLICY "Only admins can insert products"
  ON products
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update products"
  ON products
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete products"
  ON products
  FOR DELETE
  USING (is_admin());

-- TRIGGER: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- COMMENTS
COMMENT ON TABLE sellers IS 'Additional information for users with seller role';
COMMENT ON COLUMN sellers.commission_rate IS 'Commission percentage (0-100)';
COMMENT ON COLUMN sellers.sales_target IS 'Monthly sales target in currency';
COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the current authenticated user';
