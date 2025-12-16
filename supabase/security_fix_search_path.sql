-- ============================================
-- FIX: Search Path Mutable Warnings
-- ============================================
-- This script fixes all 23 function search_path warnings
-- by setting a secure, immutable search_path

-- STEP 1: Fix Role Helper Functions
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_seller() SET search_path = public, pg_temp;

-- STEP 2: Fix Utility Functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.sanitize_text(TEXT) SET search_path = public, pg_temp;

-- STEP 3: Fix Invoice Functions
ALTER FUNCTION public.calculate_invoice_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_calculate_invoice_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_invoice() SET search_path = public, pg_temp;

-- STEP 4: Fix User Management Functions
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- STEP 5: Fix Stock Functions
ALTER FUNCTION public.decrement_stock() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_stock_on_purchase() SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_stock_on_purchase_delete() SET search_path = public, pg_temp;

-- STEP 6: Fix Sales Order Functions
ALTER FUNCTION public.auto_calculate_sales_order_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_sales_order_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.execute_sales_order(UUID) SET search_path = public, pg_temp;

-- STEP 7: Fix Audit Logging Functions
ALTER FUNCTION public.log_audit_event() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_audit_logs_for_record(TEXT, UUID) SET search_path = public, pg_temp;

-- STEP 8: Fix Performance Functions
ALTER FUNCTION public.get_seller_performance(UUID, DATE, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_seller_monthly_sales(UUID, INTEGER, INTEGER) SET search_path = public, pg_temp;

-- STEP 9: Fix Validation Functions
ALTER FUNCTION public.is_valid_email(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_phone(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_product_secure(TEXT, TEXT, TEXT, NUMERIC, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_customer_secure(TEXT, TEXT, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;

-- STEP 10: Verification
-- Query to check if all functions now have search_path set
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_user_role',
    'is_admin',
    'is_seller',
    'update_updated_at_column',
    'calculate_invoice_item_total',
    'auto_calculate_invoice_item_total',
    'handle_new_user',
    'decrement_stock',
    'auto_calculate_sales_order_item_total',
    'update_sales_order_total',
    'execute_sales_order',
    'log_audit_event',
    'get_audit_logs_for_record',
    'get_seller_performance',
    'get_seller_monthly_sales',
    'increment_stock_on_purchase',
    'decrement_stock_on_purchase_delete',
    'sanitize_text',
    'validate_invoice',
    'create_product_secure',
    'create_customer_secure',
    'is_valid_email',
    'is_valid_phone'
)
ORDER BY p.proname;

-- Expected: All functions should have proconfig showing search_path

-- ============================================
-- NOTES:
-- ============================================
-- ✅ Fixes all 23 search_path warnings
-- ✅ Sets secure, immutable search_path
-- ✅ Prevents search_path manipulation attacks
-- ✅ No breaking changes - functions work the same
-- ============================================

-- WHAT THIS DOES:
-- Before: Function could use any search_path (vulnerable)
-- After:  Function ALWAYS uses 'public, pg_temp' (secure)
--
-- This prevents an attacker from creating malicious
-- functions/tables in other schemas that could be called
-- instead of the intended ones.
-- ============================================
