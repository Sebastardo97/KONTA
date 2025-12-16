-- ============================================
-- FIX: Search Path - Minimal Safe Version
-- ============================================
-- Only fixes functions confirmed by the linter warnings

-- These functions were confirmed in the linter output:
-- 1. get_user_role
-- 2. is_admin  
-- 3. is_seller
-- 4. update_updated_at_column
-- 5. auto_calculate_invoice_item_total
-- 6. handle_new_user
-- 7. auto_calculate_sales_order_item_total
-- 8. update_sales_order_total
-- 9. execute_sales_order
-- 10. log_audit_event
-- 11. get_audit_logs_for_record
-- 12. get_seller_performance
-- 13. get_seller_monthly_sales
-- 14. increment_stock_on_purchase
-- 15. decrement_stock_on_purchase_delete
-- 16. sanitize_text
-- 17. validate_invoice
-- 18. create_product_secure
-- 19. create_customer_secure
-- 20. is_valid_email
-- 21. is_valid_phone

-- ============================================
-- SAFE EXECUTION - One function at a time
-- ============================================

-- 1. Role helpers
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_seller() SET search_path = public, pg_temp;

-- 2. Triggers
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- 3. Invoice calculations
ALTER FUNCTION public.auto_calculate_invoice_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_invoice() SET search_path = public, pg_temp;

-- 4. User management  
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 5. Sales orders
ALTER FUNCTION public.auto_calculate_sales_order_item_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_sales_order_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.execute_sales_order(UUID) SET search_path = public, pg_temp;

-- 6. Audit logging
ALTER FUNCTION public.log_audit_event() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_audit_logs_for_record(TEXT, UUID) SET search_path = public, pg_temp;

-- 7. Performance
ALTER FUNCTION public.get_seller_performance(UUID, DATE, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_seller_monthly_sales(UUID, INTEGER, INTEGER) SET search_path = public, pg_temp;

-- 8. Stock management
ALTER FUNCTION public.increment_stock_on_purchase() SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_stock_on_purchase_delete() SET search_path = public, pg_temp;

-- 9. Validation helpers
ALTER FUNCTION public.sanitize_text(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_email(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_phone(TEXT) SET search_path = public, pg_temp;

-- 10. Secure creation functions
ALTER FUNCTION public.create_product_secure(TEXT, TEXT, TEXT, NUMERIC, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_customer_secure(TEXT, TEXT, TEXT, TEXT, TEXT) SET search_path = public, pg_temp;

-- ============================================
-- Verification
-- ============================================
SELECT '✅ Search path fixed for 21 functions!' as result;
