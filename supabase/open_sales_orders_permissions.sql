-- ==============================================================================
-- OPEN SALES ORDERS TO ALL SELLERS
-- ==============================================================================
-- Objective: Allow ANY seller to create, view, and edit ANY sales order.
-- This supports the workflow where Seller A creates an order and Seller B executes it.
-- ==============================================================================

-- 1. DROP RESTRICTIVE POLICIES ON sales_orders
DROP POLICY IF EXISTS "Sellers can see assigned orders" ON sales_orders;
DROP POLICY IF EXISTS "Sellers can execute assigned orders" ON sales_orders;

-- 2. CREATE PERMISSIVE POLICIES ON sales_orders
-- Allow sellers to see ALL orders (not just assigned ones)
CREATE POLICY "Sellers can view all sales orders"
  ON sales_orders
  FOR SELECT
  USING (is_seller());

-- Allow sellers to INSERT, UPDATE, DELETE all orders
CREATE POLICY "Sellers can manage all sales orders"
  ON sales_orders
  FOR ALL
  USING (is_seller());

-- 3. DROP RESTRICTIVE POLICIES ON sales_order_items
DROP POLICY IF EXISTS "Users can read order items if they can read order" ON sales_order_items;

-- 4. CREATE PERMISSIVE POLICIES ON sales_order_items
-- Allow sellers to see ALL items
CREATE POLICY "Sellers can view all order items"
  ON sales_order_items
  FOR SELECT
  USING (is_seller());

-- Allow sellers to manage ALL items (add/remove products from any order)
CREATE POLICY "Sellers can manage all order items"
  ON sales_order_items
  FOR ALL
  USING (is_seller());

-- 5. OPTIONAL: Fix 'created_by' default if needed
-- If the UI doesn't send 'created_by', we can default it to auth.uid()
ALTER TABLE sales_orders
ALTER COLUMN created_by SET DEFAULT auth.uid();
