-- ==============================================================================
-- SECURITY FIX: FINAL (INCLUDES ADMIN WRITE ACCESS)
-- ==============================================================================

-- 1. Functions
ALTER FUNCTION public.decrement_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.increment_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;

-- 2. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. SALES ORDERS (Fixed for Admin Workflow)
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Clean slate
DROP POLICY IF EXISTS "Authenticated can create orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Authenticated can update orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers view own orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Admins view all orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers create own orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers update own pending orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Admins full access to sales orders" ON public.sales_orders;

-- ADMINS: FULL ACCESS (Required to invoice/complete orders from ANY seller)
CREATE POLICY "Admins full access to sales orders" ON public.sales_orders
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- SELLERS: Restricted access
CREATE POLICY "Sellers view own orders" ON public.sales_orders
FOR SELECT TO authenticated USING (assigned_to = auth.uid());

CREATE POLICY "Sellers create own orders" ON public.sales_orders
FOR INSERT TO authenticated WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Sellers update own pending orders" ON public.sales_orders
FOR UPDATE TO authenticated USING (assigned_to = auth.uid());

-- 4. SALES ORDER ITEMS
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Clean slate
DROP POLICY IF EXISTS "Authenticated can create order items" ON public.sales_order_items; 
DROP POLICY IF EXISTS "Authenticated can update order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales_order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales_order_items;
DROP POLICY IF EXISTS "View items if can view order" ON public.sales_order_items;
DROP POLICY IF EXISTS "Insert items if can create order" ON public.sales_order_items;
DROP POLICY IF EXISTS "Admins full access to order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Sellers view own order items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Sellers create own order items" ON public.sales_order_items;

-- ADMINS: FULL ACCESS
CREATE POLICY "Admins full access to order items" ON public.sales_order_items
FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- SELLERS: Restricted access (via parent order ownership)
CREATE POLICY "Sellers view own order items" ON public.sales_order_items
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders 
    WHERE sales_orders.id = sales_order_items.sales_order_id 
    AND sales_orders.assigned_to = auth.uid()
  )
);

CREATE POLICY "Sellers create own order items" ON public.sales_order_items
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales_orders 
    WHERE sales_orders.id = sales_order_items.sales_order_id 
    AND sales_orders.assigned_to = auth.uid()
  )
);

CREATE POLICY "Sellers update own order items" ON public.sales_order_items
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders 
    WHERE sales_orders.id = sales_order_items.sales_order_id 
    AND sales_orders.assigned_to = auth.uid()
  )
);
