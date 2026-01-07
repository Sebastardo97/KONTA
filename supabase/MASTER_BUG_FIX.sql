-- MASTER FIX SCRIPT
-- This script fixes 3 potential issues at once:
-- 1. SYNC: Forces your "Admin" role from the profiles table into the Auth system (metadata).
-- 2. RECURSION: Bypasses the infinite loop when checking permissions.
-- 3. PERMISSIONS: Ensures the helper function allows execution.

-- PART 1: Sync Profiles -> Auth Metadata
-- This ensures useRole() sees the correct role immediately without checking the database repeatedly.
DO $$
DECLARE
  user_record record;
BEGIN
  FOR user_record IN SELECT * FROM public.profiles LOOP
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END;
$$;

-- PART 2: Fix Recursion (Security Definer)
CREATE OR REPLACE FUNCTION public.get_my_claim_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  return user_role;
END;
$$;

-- Grant execution permission to everyone (authenticated)
GRANT EXECUTE ON FUNCTION public.get_my_claim_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_claim_role TO service_role;

-- PART 3: Apply Optimized RLS Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop old policies to be clean
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_seller_insert_products" ON products;
DROP POLICY IF EXISTS "admin_seller_update_products" ON products;
DROP POLICY IF EXISTS "admin_seller_delete_products" ON products;

-- 3.1 Profiles Policies
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING ( auth.uid() = id );

CREATE POLICY "Admins view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING ( get_my_claim_role() = 'admin' );

-- 3.2 Products Policies (Admin & Seller management)
CREATE POLICY "admin_seller_insert_products"
ON products FOR INSERT TO authenticated
WITH CHECK ( get_my_claim_role() IN ('admin', 'seller') );

CREATE POLICY "admin_seller_update_products"
ON products FOR UPDATE TO authenticated
USING ( get_my_claim_role() IN ('admin', 'seller') )
WITH CHECK ( get_my_claim_role() IN ('admin', 'seller') );

CREATE POLICY "admin_seller_delete_products"
ON products FOR DELETE TO authenticated
USING ( get_my_claim_role() IN ('admin', 'seller') );

-- PART 4: Verification Output
SELECT 
  p.email, 
  p.role as profile_role, 
  u.raw_user_meta_data->>'role' as auth_metadata_role
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.email;
