-- FIX RECURSIVE RLS POLICIES
-- The previous policies caused an infinite loop (recursion) because checking if a user is an admin required reading the profiles table, which triggered the RLS policy again.

-- 1. Create a helper function that bypasses RLS (SECURITY DEFINER)
-- This allows us to check the user's role securely without triggering infinite recursion.
CREATE OR REPLACE FUNCTION public.get_my_claim_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the creator (bypass RLS)
SET search_path = public -- Security best practice
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- 2. Drop existing problematic policies on Profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. Re-create Optimized Policies

-- Policy: Everyone can see their own profile
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Policy: Admins can see ALL profiles
-- Uses the function to avoid recursion
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_my_claim_role() = 'admin'
);

-- 4. Update Products policies to use the safe function (to be sure)
-- (Dropping potentially recursive policies on products)
DROP POLICY IF EXISTS "admin_seller_insert_products" ON products;
DROP POLICY IF EXISTS "admin_seller_update_products" ON products;
DROP POLICY IF EXISTS "admin_seller_delete_products" ON products;

CREATE POLICY "admin_seller_insert_products"
ON products FOR INSERT TO authenticated
WITH CHECK (
  get_my_claim_role() IN ('admin', 'seller')
);

CREATE POLICY "admin_seller_update_products"
ON products FOR UPDATE TO authenticated
USING (
  get_my_claim_role() IN ('admin', 'seller')
)
WITH CHECK (
  get_my_claim_role() IN ('admin', 'seller')
);

CREATE POLICY "admin_seller_delete_products"
ON products FOR DELETE TO authenticated
USING (
  get_my_claim_role() IN ('admin', 'seller')
);
