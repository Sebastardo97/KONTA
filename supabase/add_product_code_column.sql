-- Add 'code' column to products table
-- This will be the product reference/SKU

-- Add the column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Make it unique (optional but recommended)
-- ALTER TABLE products
-- ADD CONSTRAINT products_code_unique UNIQUE (code);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

-- Update existing products with auto-generated codes (optional)
-- This gives existing products a code based on their ID
UPDATE products 
SET code = 'PROD-' || LPAD(id::TEXT, 5, '0')
WHERE code IS NULL OR code = '';

-- Verify the changes
SELECT id, code, name, price FROM products LIMIT 5;
