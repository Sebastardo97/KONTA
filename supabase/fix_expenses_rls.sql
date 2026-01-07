-- Fix Expenses RLS Policies
-- Issue: Admins were not seeing all expenses in the list, likely due to restrictive policies or missing admin check in the select policy.
-- Goal: Ensure Admins see EVERYTHING. Sellers see only their own records (or records where they are the 'user_id' responsible).

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Sellers view own expenses" ON expenses;
DROP POLICY IF EXISTS "Admins full access to expenses" ON expenses;

-- 2. Re-create Policies

-- A. ADMINS: Full Access (Select, Insert, Update, Delete)
CREATE POLICY "Admins full access"
  ON expenses
  FOR ALL
  USING (
    public.is_admin() OR 
    auth.jwt() ->> 'email' = 'admin@konta.com' -- Fallback if is_admin() function has issues
  );

-- B. SELLERS (or any authenticated user):
-- Can see expenses where they are the 'user_id' (responsible) OR 'created_by' (who entered it)
CREATE POLICY "Users view own related expenses"
  ON expenses
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = created_by
  );

-- Can insert expenses (anyone can register an expense, usually)
CREATE POLICY "Authenticated users can insert expenses"
  ON expenses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Can update if they created it
CREATE POLICY "Users can update own created expenses"
  ON expenses
  FOR UPDATE
  USING (auth.uid() = created_by);
