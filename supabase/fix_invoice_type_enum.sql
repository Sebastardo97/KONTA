
-- FUNCTION: Create POS Invoice (Fixed for ENUM type mismatch)
CREATE OR REPLACE FUNCTION create_pos_invoice(
  p_customer_id UUID,
  p_seller_id UUID,
  p_items JSONB,
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
  -- Explicitly cast p_invoice_type to invoice_type ENUM
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
    'paid',
    p_invoice_type::invoice_type, -- FIX: Explicit cast to ENUM
    timezone('utc'::text, now())
  ) RETURNING id INTO v_invoice_id;

  -- 2. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_discount := COALESCE((v_item->>'discount_percentage')::NUMERIC, 0);
    
    v_item_total := v_quantity * v_unit_price * (1 - v_discount / 100);

    PERFORM decrement_stock(v_product_id, v_quantity);

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
