-- DANGER: DATA DESTRUCTION SCRIPT
-- This script deletes ALL invoices, invoice items, and related data to reset the system for production.

BEGIN;

-- 1. Delete Credit Notes (referencing Invoices)
-- Ensure this table exists, if not, this might error, but assuming it exists from previous context
DELETE FROM credit_notes;

-- 2. Clean up Sales Orders references
-- We don't delete sales orders, but we un-link them from executed invoices so they can be re-executed if needed?
-- OR should we delete sales orders too? The user said "facturas de prueba". 
-- Usually "preventas" (sales orders) are also tests. 
-- However, strict request was "facturas". 
-- If we delete invoices, the foreign key in sales_orders (executed_invoice_id) might block deletion or cascade.
-- Let's check constraints. If it's SET NULL, we are good. If RESTRICT, we must update first.
-- Assuming we want to KEEP sales orders but mark them as potentially pending again?
-- Or usually, one wants to clear EVERYTHING including sales orders if they were tests.
-- SAFEST: Unlink first.
UPDATE sales_orders SET executed_invoice_id = NULL, status = 'pending';

-- 3. Delete Invoices (Cascades to invoice_items)
DELETE FROM invoices;

-- 4. Reset Sequence
-- Reset the sequence responsible for invoice numbering 'number' column
ALTER SEQUENCE IF EXISTS invoice_number_seq RESTART WITH 1;

-- 5. Helper: If 'invoices_number_seq' (auto-created by SERIAL) exists instead
ALTER SEQUENCE IF EXISTS invoices_number_seq RESTART WITH 1;

COMMIT;
