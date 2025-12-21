-- SECURITY PATCH: FIX POS INVOICE TOTAL MANIPULATION
-- =====================================================
-- Vulnerability: Client could send arbitrary 'p_total' which was trusted blindly.
-- Fix: Server now calculates total from items, ignoring client's p_total.
-- =====================================================

CREATE OR REPLACE FUNCTION create_pos_invoice(
  p_customer_id UUID,
  p_seller_id UUID,
  p_items JSONB, -- Array: { product_id, quantity, unit_price, discount_percentage }
  p_total NUMERIC, -- Kept for signature compatibility, but IGNORED for calculation
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
  
  -- New variable for server-side calculation
  v_calculated_total NUMERIC := 0;
BEGIN
  -- 1. SECURITY STEP: Calculate True Total first
  -- We rely purely on the items array details.
  -- Note: Ideally we should fetch price from DB too, but for now we fix the summation logic.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_discount := COALESCE((v_item->>'discount_percentage')::NUMERIC, 0);
    
    -- Validate inputs
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    IF v_unit_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;

    -- Accumulate total
    v_calculated_total := v_calculated_total + (v_quantity * v_unit_price * (1 - v_discount / 100));
  END LOOP;

  -- 2. Create Invoice Header with SECURE TOTAL
  INSERT INTO invoices (
    customer_id,
    seller_id,
    total, -- <--- USING CALCULATED TOTAL
    status,
    invoice_type,
    date
  ) VALUES (
    p_customer_id,
    p_seller_id,
    v_calculated_total, -- <--- SECURE
    'paid',
    p_invoice_type::invoice_type,
    timezone('utc'::text, now())
  ) RETURNING id INTO v_invoice_id;

  -- 3. Process Items (Insert and Stock)
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
