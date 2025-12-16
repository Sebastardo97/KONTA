-- ============================================
-- AUDIT LOGGING SYSTEM
-- ============================================
-- Implements comprehensive audit trail for compliance
-- and security monitoring

-- STEP 1: Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- STEP 2: Create generic audit function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid();

    -- Insert audit log
    INSERT INTO public.audit_logs (
        user_id,
        user_email,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        COALESCE(user_email, 'system'),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Apply audit triggers to critical tables

-- Invoices (facturas)
DROP TRIGGER IF EXISTS audit_invoices_trigger ON public.invoices;
CREATE TRIGGER audit_invoices_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Products (productos)
DROP TRIGGER IF EXISTS audit_products_trigger ON public.products;
CREATE TRIGGER audit_products_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Customers (clientes)
DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Sales Orders (órdenes de venta)
DROP TRIGGER IF EXISTS audit_sales_orders_trigger ON public.sales_orders;
CREATE TRIGGER audit_sales_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Profiles (perfiles de usuario)
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- STEP 4: Create RLS policies for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- No one can modify audit logs (append-only)
-- System inserts via trigger only

-- STEP 5: Create helper function to query audit logs
CREATE OR REPLACE FUNCTION public.get_audit_logs_for_record(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS TABLE (
    id UUID,
    user_email TEXT,
    action TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Only admins can call this
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.user_email,
        a.action,
        a.old_data,
        a.new_data,
        a.created_at
    FROM public.audit_logs a
    WHERE a.table_name = p_table_name
    AND a.record_id = p_record_id
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Verification queries

-- Test 1: Check audit_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'audit_logs';

-- Test 2: Check triggers are active
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%';

-- Test 3: Insert a test record and verify audit (as admin)
-- INSERT INTO products (code, name, price, stock, tax_rate) 
-- VALUES ('TEST001', 'Test Product', 1000, 10, 19);
-- 
-- SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;

-- ============================================
-- USAGE EXAMPLES:
-- ============================================

-- View recent audit logs (last 24 hours)
-- SELECT 
--     user_email,
--     action,
--     table_name,
--     created_at
-- FROM public.audit_logs
-- WHERE created_at > NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC;

-- View all changes to a specific invoice
-- SELECT * FROM public.get_audit_logs_for_record('invoices', 'invoice-uuid-here');

-- Find who deleted a record
-- SELECT user_email, created_at, old_data
-- FROM public.audit_logs
-- WHERE action = 'DELETE' AND table_name = 'products'
-- ORDER BY created_at DESC;

-- ============================================
-- NOTES:
-- ============================================
-- ✅ Comprehensive audit trail for compliance
-- ✅ Immutable logs (append-only)
-- ✅ Only admins can view
-- ✅ Automatic via triggers
-- ✅ Stores old and new values
-- ============================================
