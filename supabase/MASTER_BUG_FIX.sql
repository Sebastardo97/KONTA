-- ============================================
-- KONTA - Master Bug Fix Script
-- Ejecutar en orden para corregir todos los bugs
-- ============================================

-- Fecha: 2025-12-16
-- Bugs Corregidos: #1, #3, #4
-- Nota: Bug #2 (rollback) se maneja en código
--       Bug #5 (paginación) se implementa en frontend

BEGIN;

-- ============================================
-- FIX #1: NUMERACIÓN CONSECUTIVA DE FACTURAS
-- ============================================

-- Create sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Add number column
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS number INTEGER;

-- Create auto-number function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number := nextval('invoice_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Populate existing invoices
WITH numbered_invoices AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM invoices
  WHERE number IS NULL
)
UPDATE invoices
SET number = numbered_invoices.new_number
FROM numbered_invoices
WHERE invoices.id = numbered_invoices.id;

-- Reset sequence
SELECT setval('invoice_number_seq', COALESCE((SELECT MAX(number) FROM invoices), 0) + 1, false);

-- Make NOT NULL
ALTER TABLE invoices ALTER COLUMN number SET NOT NULL;

-- Add unique constraint
ALTER TABLE invoices ADD CONSTRAINT invoices_number_unique UNIQUE (number);

-- ============================================
-- FIX #3: CONSTRAINTS DE INTEGRIDAD
-- ============================================

-- Customers ON DELETE RESTRICT
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE RESTRICT;

-- Sellers ON DELETE RESTRICT
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_seller_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_seller_id_fkey 
FOREIGN KEY (seller_id) 
REFERENCES profiles(id) 
ON DELETE RESTRICT;

-- Products ON DELETE RESTRICT
ALTER TABLE invoice_items 
DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;

ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES products(id) 
ON DELETE RESTRICT;

-- ============================================
-- FIX #4: VALIDACIÓN DE DESCUENTOS
-- ============================================

-- Invoice items discount range
ALTER TABLE invoice_items
DROP CONSTRAINT IF EXISTS check_discount_range;

ALTER TABLE invoice_items
ADD CONSTRAINT check_discount_range 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Sales order items discount range
ALTER TABLE sales_order_items
DROP CONSTRAINT IF EXISTS check_discount_range;

ALTER TABLE sales_order_items
ADD CONSTRAINT check_discount_range 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify invoice numbering
SELECT 
    'Invoice Numbering' as check_name,
    COUNT(*) as total_invoices,
    MIN(number) as min_number,
    MAX(number) as max_number
FROM invoices;

-- Verify constraints
SELECT 
    'Constraints' as check_name,
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid IN ('invoices'::regclass, 'invoice_items'::regclass)
  AND conname LIKE '%fkey%' OR conname LIKE '%check%'
ORDER BY conrelid, conname;

COMMIT;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- If something fails, run:
-- ROLLBACK;
