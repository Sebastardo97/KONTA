-- =====================================================
-- POS ATOMIC TRANSACTION
-- =====================================================

-- FUNCTION: Create POS Invoice
-- Handles the entire transaction atomically:
-- 1. Decrements stock (validating availability)
-- 2. Creates the invoice record
-- 3. Creates invoice items
-- If any step fails, the entire transaction is rolled back.

CREATE OR REPLACE FUNCTION create_pos_invoice(
  p_customer_id UUID,
  p_seller_id UUID,
  p_items JSONB, -- Array of objects: { product_id, quantity, unit_price, discount_percentage }
  p_total NUMERIC,
  p_invoice_type TEXT DEFAULT 'POS'
)
RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price NUMERIC;
  v_discount NUMERIC;
  v_item_total NUMERIC;
BEGIN
  -- 1. Create Invoice Header
  INSERT INTO invoices (
    customer_id,
    seller_id,
    total,
    status,
    invoice_type,
    date
  ) VALUES (
    p_customer_id,
    p_seller_id,
    p_total,
    'paid', -- POS invoices are always paid immediately
    p_invoice_type,
    timezone('utc'::text, now())
  ) RETURNING id INTO v_invoice_id;

  -- 2. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_discount := COALESCE((v_item->>'discount_percentage')::NUMERIC, 0);
    
    -- Calculate item total with discount
    v_item_total := v_quantity * v_unit_price * (1 - v_discount / 100);

    -- A. Decrement Stock (This will raise exception if stock is insufficient)
    -- We assume decrement_stock function exists and handles locking
    PERFORM decrement_stock(v_product_id, v_quantity);

    -- B. Insert Invoice Item
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      quantity,
      unit_price,
      discount_percentage,
      total
    ) VALUES (
      v_invoice_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_discount,
      v_item_total
    );
    
  END LOOP;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
