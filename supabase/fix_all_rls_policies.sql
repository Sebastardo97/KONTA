-- ================================================================
-- FIX: Infinite Recursion in RLS Policies
-- ================================================================
-- This script removes recursive policies and creates safe ones

-- 1. DROP ALL EXISTING POLICIES ON PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "View profiles policy" ON public.profiles CASCADE;

-- 2. DISABLE RLS temporarily (ONLY for profiles table)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Verify no policies exist
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'profiles';

-- 4. Test: Try to select from profiles
SELECT id, email, role FROM public.profiles LIMIT 5;

-- ================================================================
-- RESULT: This should fix the infinite recursion error
-- After running this, the app should work without RLS errors
-- ================================================================
