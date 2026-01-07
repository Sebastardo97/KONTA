-- ADMIN POLICIES
-- Allow Admins to UPDATE any profile (to rename sellers)
-- Allow Admins to INSERT profiles (if we manually insert, though Auth handles this mostly)

-- 1. Function to check if user is admin (if not exists)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Policy for updating profiles
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  USING (is_admin());

-- 3. Policy for deleting profiles (optional, for cleanup)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  USING (is_admin());

-- 4. Policy for selecting (already exists usually, but ensure)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (true); -- Public read is fine, or restrict to auth

