-- Complete Products Table Schema Fix
-- Add ALL missing columns at once

-- Add 'code' column (product reference/SKU)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Add 'description' column (product details)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

-- Update existing products with auto-generated codes
UPDATE products 
SET code = 'PROD-' || LPAD(id::TEXT, 5, '0')
WHERE code IS NULL OR code = '';

-- Update existing products with default description
UPDATE products 
SET description = 'Sin descripción'
WHERE description IS NULL OR description = '';

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Show sample data
SELECT id, code, name, description, price, stock
FROM products
LIMIT 3;
