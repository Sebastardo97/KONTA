-- FIX BUG #3 y #4: Constraints de Integridad y Validación

-- BUG #3: Prevenir eliminación de registros con relaciones
-- ========================================================

-- Step 1: Add ON DELETE RESTRICT to customer foreign key
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE RESTRICT;

-- Step 2: Add ON DELETE RESTRICT to seller foreign key
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_seller_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_seller_id_fkey 
FOREIGN KEY (seller_id) 
REFERENCES profiles(id) 
ON DELETE RESTRICT;

-- Step 3: Add ON DELETE RESTRICT to product in invoice_items
ALTER TABLE invoice_items 
DROP CONSTRAINT IF EXISTS invoice_items_product_id_fkey;

ALTER TABLE invoice_items
ADD CONSTRAINT invoice_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES products(id) 
ON DELETE RESTRICT;

-- BUG #4: Validar rango de descuentos (0-100%)
-- =============================================

-- Add check constraint for discount_percentage
ALTER TABLE invoice_items
DROP CONSTRAINT IF EXISTS check_discount_range;

ALTER TABLE invoice_items
ADD CONSTRAINT check_discount_range 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Also add to sales_order_items if exists
ALTER TABLE sales_order_items
DROP CONSTRAINT IF EXISTS check_discount_range;

ALTER TABLE sales_order_items
ADD CONSTRAINT check_discount_range 
CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Verify constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
   OR conrelid = 'invoice_items'::regclass
ORDER BY conrelid, conname;
