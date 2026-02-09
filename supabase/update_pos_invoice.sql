-- =====================================================
-- UPDATE POS INVOICE RPC
-- =====================================================

CREATE OR REPLACE FUNCTION update_pos_invoice(
  p_invoice_id UUID,
  p_customer_id UUID,
  p_seller_id UUID,
  p_items JSONB, -- Array: { product_id, quantity, unit_price, discount_percentage }
  p_total NUMERIC, -- Included for signature compatibility, server calculates
  p_invoice_type TEXT DEFAULT 'NORMAL'
)
RETURNS VOID AS $$
DECLARE
  v_old_item RECORD;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price NUMERIC;
  v_discount NUMERIC;
  v_item_total NUMERIC;
  v_calculated_total NUMERIC := 0;
BEGIN
  -- 1. REVERT STOCK for existing items
  FOR v_old_item IN SELECT product_id, quantity FROM invoice_items WHERE invoice_id = p_invoice_id
  LOOP
    -- Assuming increment_stock exists, otherwise manual update
    PERFORM increment_stock(v_old_item.product_id, v_old_item.quantity);
  END LOOP;

  -- 2. DELETE existing items
  DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;

  -- 3. CALCULATE NEW TOTAL
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_discount := COALESCE((v_item->>'discount_percentage')::NUMERIC, 0);

    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    IF v_unit_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;

    v_calculated_total := v_calculated_total + (v_quantity * v_unit_price * (1 - v_discount / 100));
  END LOOP;

  -- 4. UPDATE INVOICE HEADER
  UPDATE invoices SET
    customer_id = p_customer_id,
    seller_id = p_seller_id,
    total = v_calculated_total,
    invoice_type = p_invoice_type::invoice_type, -- Cast if enum
    updated_at = timezone('utc'::text, now())
  WHERE id = p_invoice_id;

  -- 5. PROCESS NEW ITEMS
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_discount := COALESCE((v_item->>'discount_percentage')::NUMERIC, 0);
    
    v_item_total := v_quantity * v_unit_price * (1 - v_discount / 100);

    -- A. Decrement Stock
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
      p_invoice_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_discount,
      v_item_total
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
