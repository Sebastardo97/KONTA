-- 1. Redefine decrement_stock with strict validation
CREATE OR REPLACE FUNCTION decrement_stock(row_id uuid, quantity int)
RETURNS void AS $$
DECLARE
  current_stock int;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT stock INTO current_stock FROM products WHERE id = row_id FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF current_stock < quantity THEN
    RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', current_stock, quantity;
  END IF;

  UPDATE products SET stock = stock - quantity WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Add CHECK constraint to ensure stock never goes negative (catch-all safety net)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_stock_non_negative'
    ) THEN
        ALTER TABLE products
        ADD CONSTRAINT check_stock_non_negative
        CHECK (stock >= 0);
    END IF;
END $$;
