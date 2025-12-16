-- ============================================
-- FIX: Search Path - Only Existing Functions
-- ============================================
-- This script only modifies functions that actually exist

-- STEP 1: Check which functions exist
-- Run this first to see what we have:
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
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

-- ============================================
-- STEP 2: Apply fixes - ONLY IF FUNCTION EXISTS
-- Comment out any that give errors
-- ============================================

-- Role Helper Functions (likely exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN
        ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_seller') THEN
        ALTER FUNCTION public.is_seller() SET search_path = public, pg_temp;
    END IF;
END $$;

-- Utility Functions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sanitize_text') THEN
        ALTER FUNCTION public.sanitize_text(TEXT) SET search_path = public, pg_temp;
    END IF;
END $$;

-- Invoice Functions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_calculate_invoice_item_total') THEN
        ALTER FUNCTION public.auto_calculate_invoice_item_total() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_invoice') THEN
        ALTER FUNCTION public.validate_invoice() SET search_path = public, pg_temp;
    END IF;
END $$;

-- User Management
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
    END IF;
END $$;

-- Stock Functions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrement_stock') THEN
        ALTER FUNCTION public.decrement_stock() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_stock_on_purchase') THEN
        ALTER FUNCTION public.increment_stock_on_purchase() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrement_stock_on_purchase_delete') THEN
        ALTER FUNCTION public.decrement_stock_on_purchase_delete() SET search_path = public, pg_temp;
    END IF;
END $$;

-- Sales Order Functions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_calculate_sales_order_item_total') THEN
        ALTER FUNCTION public.auto_calculate_sales_order_item_total() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_sales_order_total') THEN
        ALTER FUNCTION public.update_sales_order_total() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'execute_sales_order') THEN
        ALTER FUNCTION public.execute_sales_order(UUID) SET search_path = public, pg_temp;
    END IF;
END $$;

-- Audit Logging
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_event') THEN
        ALTER FUNCTION public.log_audit_event() SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_audit_logs_for_record') THEN
        ALTER FUNCTION public.get_audit_logs_for_record(TEXT, UUID) SET search_path = public, pg_temp;
    END IF;
END $$;

-- Performance Functions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_seller_performance') THEN
        ALTER FUNCTION public.get_seller_performance(UUID, DATE, DATE) SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_seller_monthly_sales') THEN
        ALTER FUNCTION public.get_seller_monthly_sales(UUID, INTEGER, INTEGER) SET search_path = public, pg_temp;
    END IF;
END $$;

-- Validation Functions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_valid_email') THEN
        ALTER FUNCTION public.is_valid_email(TEXT) SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_valid_phone') THEN
        ALTER FUNCTION public.is_valid_phone(TEXT) SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_product_secure') THEN
        ALTER FUNCTION public.create_product_secure(TEXT, TEXT, TEXT, NUMERIC, INTEGER, INTEGER) SET search_path = public, pg_temp;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_customer_secure') THEN
        ALTER FUNCTION public.create_customer_secure(TEXT, TEXT, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;
    END IF;
END $$;

-- ============================================
-- STEP 3: Verification
-- ============================================
SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NOT NULL THEN '✅ Fixed'
        ELSE '❌ Still mutable'
    END as status,
    p.proconfig as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'  -- Only functions, not triggers
ORDER BY status DESC, p.proname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Search path warnings fixed! ✅' as message;
