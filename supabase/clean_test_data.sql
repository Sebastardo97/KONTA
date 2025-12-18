-- SAFE CLEANUP SCRIPT FOR CLIENT DELIVERY
-- ==========================================
-- This script removes all SALES transaction history (Invoices, POS, Orders)
-- It PRESERVES: Products, Stock, Customers, Sellers, Suppliers, and Purchases (Gastos)
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Go to Supabase SQL Editor
-- 3. Run it
-- 4. Verify Dashboard is empty

BEGIN;

    -- 1. Clear Pre-sales (Pedidos/Remisiones) - Must be deleted FIRST because they reference invoices
    DELETE FROM sales_order_items;
    DELETE FROM sales_orders;

    -- 2. Clear Returns (Devoluciones)
    DELETE FROM credit_note_items;
    DELETE FROM credit_notes;

    -- 3. Clear Sales (Facturas y POS)
    DELETE FROM invoice_items;
    DELETE FROM invoices;

    -- 4. Clear Audit Logs (Optional - removes history of test actions)
    DELETE FROM audit_logs;

    -- 5. Reset Allocations/Counters
    -- Reset Invoice Numbering Sequence to start from #1 next time
    ALTER SEQUENCE invoice_number_seq RESTART WITH 1;

    -- 6. Verification Output
    SELECT '✅ System cleaned. Sales history removed. Products & Stock preserved.' as result;

COMMIT;
