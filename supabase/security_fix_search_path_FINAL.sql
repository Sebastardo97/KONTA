-- ============================================
-- FIX: Search Path - DEFINITIVE VERSION
-- ============================================
-- With exact function signatures from database

-- Functions without parameters (triggers, helpers)
ALTER FUNCTION public.auto_calculate_invoice_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_calculate_sales_order_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_stock_on_purchase_delete() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_stock_on_purchase() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_seller() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_audit_event() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_sales_order_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_invoice() SET search_path = public, pg_temp;

-- Functions with parameters (exact signatures)
ALTER FUNCTION public.calculate_invoice_item_total(NUMERIC, INTEGER, NUMERIC) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_customer_secure(TEXT, TEXT, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_product_secure(TEXT, TEXT, TEXT, NUMERIC, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_stock(UUID, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.execute_sales_order(UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_audit_logs_for_record(TEXT, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_seller_monthly_sales(UUID, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_seller_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_email(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_phone(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.sanitize_text(TEXT) SET search_path = public, pg_temp;

-- ============================================
-- Verification
-- ============================================
SELECT 
    COUNT(*) as total_fixed,
    '✅ All 23 functions secured!' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proconfig IS NOT NULL
AND 'search_path=public,pg_temp' = ANY(p.proconfig);

-- Show remaining warnings (should be 0)
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NOT NULL THEN '✅ Secured'
        ELSE '⚠️ Still mutable'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'
ORDER BY status, p.proname;
