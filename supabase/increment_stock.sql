-- Function to restore stock (opposite of decrement_stock)
CREATE OR REPLACE FUNCTION increment_stock(row_id uuid, quantity int)
RETURNS void AS $$
BEGIN
  -- Lock the row to prevent race conditions
  UPDATE products
  SET stock = stock + quantity
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
