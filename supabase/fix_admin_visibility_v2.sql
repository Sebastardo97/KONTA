-- ==============================================================================
-- FIX: ADMIN VISIBILITY RECURSION BUG
-- ==============================================================================
-- PROBLEM:
-- The previous RLS policies created an infinite recursion loop.
-- To check if a user is an admin (to show them all profiles), the DB had to query
-- the 'profiles' table. But querying the 'profiles' table triggered the RLS
-- policy again, which tried to check if they are an admin... ad infinitum.
--
-- SOLUTION:
-- Use a SECURITY DEFINER function. This function runs with the privileges of
-- the creator (postgres/superuser), forcing it to BYPASS RLS when checking
-- the role. This breaks the loop.

-- 1. Create the helper function with SU privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This query bypasses RLS because of SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix PROFILES Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;

-- Create Safe Policies using the new function
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- 3. Fix SALES ORDERS Policies (Apply same fix for consistency)
DROP POLICY IF EXISTS "Admins full access to sales orders" ON public.sales_orders;

CREATE POLICY "Admins full access to sales orders" ON public.sales_orders
FOR ALL TO authenticated
USING (public.is_admin());

-- 4. Fix SALES ORDER ITEMS Policies
DROP POLICY IF EXISTS "Admins full access to order items" ON public.sales_order_items;

CREATE POLICY "Admins full access to order items" ON public.sales_order_items
FOR ALL TO authenticated
USING (public.is_admin());

-- 5. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
