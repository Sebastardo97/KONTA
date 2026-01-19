-- ==============================================================================
-- SECURITY FIX: Function Search Paths & RLS Policies (FIXED COLUMNS & IDEMPOTENCY)
-- ==============================================================================

-- 1. Fix "Function Search Path Mutable" warnings
ALTER FUNCTION public.decrement_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.increment_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;

-- 2. Fix "RLS Policy Always True" warnings

-- --- PROFILES ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop insecure/old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- Secure Policies for Profiles
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- --- SALES ORDERS ---
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Drop insecure/old policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers view own orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Admins view all orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers create own orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers update own pending orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers can see assigned orders" ON public.sales_orders; 
DROP POLICY IF EXISTS "Admins full access to sales orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Sellers can execute assigned orders" ON public.sales_orders;


-- Valid Policies for Sales Orders
CREATE POLICY "Sellers view own orders" ON public.sales_orders
FOR SELECT TO authenticated USING (assigned_to = auth.uid());

CREATE POLICY "Admins view all orders" ON public.sales_orders
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Sellers create own orders" ON public.sales_orders
FOR INSERT TO authenticated WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Sellers update own pending orders" ON public.sales_orders
FOR UPDATE TO authenticated USING (assigned_to = auth.uid());


-- --- SALES ORDER ITEMS ---
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Drop insecure/old policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales_order_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sales_order_items;
DROP POLICY IF EXISTS "View items if can view order" ON public.sales_order_items;
DROP POLICY IF EXISTS "Insert items if can create order" ON public.sales_order_items;
DROP POLICY IF EXISTS "Users can read order items if they can read order" ON public.sales_order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.sales_order_items;


-- Valid Policies for Sales Order Items
CREATE POLICY "View items if can view order" ON public.sales_order_items
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders 
    WHERE sales_orders.id = sales_order_items.sales_order_id 
    AND (
        sales_orders.assigned_to = auth.uid() 
        OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY "Insert items if can create order" ON public.sales_order_items
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales_orders 
    WHERE sales_orders.id = sales_order_items.sales_order_id 
    AND sales_orders.assigned_to = auth.uid()
  )
);
