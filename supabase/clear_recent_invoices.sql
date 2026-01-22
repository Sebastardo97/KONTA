-- ==============================================================================
-- CLEAR RECENT TEST INVOICES & RESET COUNTER
-- ==============================================================================

BEGIN;

-- 1. Unlink invoices from Sales Orders (so they go back to pending if needed)
-- This prevents foreign key errors when deleting invoices
UPDATE sales_orders 
SET executed_invoice_id = NULL, status = 'pending' 
WHERE executed_invoice_id IS NOT NULL;

-- 2. Delete Credit Notes (referencing Invoices)
DELETE FROM credit_notes;

-- 3. Delete Invoices
-- This CASCADE deletes invoice_items automatically
DELETE FROM invoices;

-- 4. Reset Invoice Number Sequence
-- This forces the next invoice to be #00000001
ALTER SEQUENCE IF EXISTS invoice_number_seq RESTART WITH 1;

-- 5. Reset internal serial sequence if present (safety check)
ALTER SEQUENCE IF EXISTS invoices_id_seq RESTART WITH 1;

COMMIT;

-- Verify
SELECT count(*) as invoices_count FROM invoices;
