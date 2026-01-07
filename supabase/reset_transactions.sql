-- =====================================================
-- RESET TRANSACTIONAL DATA
-- =====================================================
-- ⚠️ WARNING: THIS WILL DELETE ALL SALES, PURCHASES, AND EXPENSES HISTORY
-- =====================================================

BEGIN;

-- 1. TRUNCATE TRANSACTIONAL TABLES (Order matters due to foreign keys)
-- We use CASCADE to handle potential dependencies not strictly listed here
TRUNCATE TABLE 
  invoice_items, 
  invoices,
  purchase_items,
  purchases,
  expenses,
  sales_orders
  RESTART IDENTITY CASCADE;

-- 2. RESET SEQUENCES
-- Reset the invoice number counter to 1
ALTER SEQUENCE IF EXISTS invoices_number_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchases_number_seq RESTART WITH 1; -- If exists
ALTER SEQUENCE IF EXISTS sales_orders_number_seq RESTART WITH 1; -- If exists

-- 3. VERIFICATION (Optional output)
-- RAISE NOTICE 'Tables truncated and sequences reset.';

COMMIT;
