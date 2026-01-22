-- 1. Add tax columns to invoice_items to snapshot the tax rate at time of sale
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

-- 2. Update the create_pos_invoice function to calculate taxes server-side
CREATE OR REPLACE FUNCTION create_pos_invoice(
  p_customer_id UUID,
  p_seller_id UUID,
  p_items JSONB, -- Array of objects: { product_id, quantity, unit_price, discount_percentage }
  p_total NUMERIC, -- We will double-check this against calculated total
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
  v_product_tax_rate NUMERIC;
  v_item_subtotal NUMERIC;
  v_item_tax NUMERIC;
  v_item_total NUMERIC;
  v_calculated_total NUMERIC := 0;
BEGIN
  -- 1. Create Invoice Header (Status 'paid')
  INSERT INTO invoices (
    customer_id,
    seller_id,
    total, -- Will update this at the end to be sure, or trust p_total if close enough? Let's calculate it.
    status,
    invoice_type,
    date
  ) VALUES (
    p_customer_id,
    p_seller_id,
    0, -- Temporary, will update
    'paid',
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
    
    -- Lookup Product Tax Rate
    SELECT tax_rate INTO v_product_tax_rate FROM products WHERE id = v_product_id;
    IF v_product_tax_rate IS NULL THEN
        v_product_tax_rate := 0; -- Default to 0 if null
    END IF;

    -- Calculate item math
    -- Subtotal = Price * Qty * (1 - Discount)
    v_item_subtotal := v_quantity * v_unit_price * (1 - v_discount / 100);
    
    -- Tax = Subtotal * (TaxRate / 100)
    v_item_tax := v_item_subtotal * (v_product_tax_rate / 100);
    
    -- Total = Subtotal + Tax
    v_item_total := v_item_subtotal + v_item_tax;
    
    -- Accumulate Grand Total
    v_calculated_total := v_calculated_total + v_item_total;

    -- A. Decrement Stock
    PERFORM decrement_stock(v_product_id, v_quantity);

    -- B. Insert Invoice Item
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      quantity,
      unit_price,
      discount_percentage,
      total,
      tax_rate,
      tax_amount
    ) VALUES (
      v_invoice_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_discount,
      v_item_total,
      v_product_tax_rate,
      v_item_tax
    );
    
  END LOOP;

  -- 3. Update Invoice Total with calculated value for security
  UPDATE invoices 
  SET total = v_calculated_total 
  WHERE id = v_invoice_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update execute_sales_order to also calculate taxes when converting to invoice
CREATE OR REPLACE FUNCTION execute_sales_order(
  p_sales_order_id UUID,
  p_executor_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_order_record RECORD;
  v_item_record RECORD;
  v_product_tax_rate NUMERIC;
  v_item_subtotal NUMERIC;
  v_item_tax NUMERIC;
  v_item_total NUMERIC;
  v_calculated_total NUMERIC := 0;
BEGIN
  -- Get the sales order
  SELECT * INTO v_order_record
  FROM sales_orders
  WHERE id = p_sales_order_id
  AND status IN ('pending', 'assigned')
  AND (assigned_to = p_executor_user_id OR assigned_to IS NULL);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found or not assigned to you';
  END IF;

  -- Create invoice (Total will be updated)
  INSERT INTO invoices (
    customer_id,
    seller_id,
    total,
    invoice_type,
    status,
    date
  ) VALUES (
    v_order_record.customer_id,
    p_executor_user_id,
    0, -- Temp total
    v_order_record.invoice_type,
    'draft', -- Draft because it might need review? Or Paid? POS is Paid. Sales Order usually becomes normal invoice -> Draft?
             -- Original code said 'draft', leaving as is.
    timezone('utc'::text, now())
  ) RETURNING id INTO v_invoice_id;

  -- Copy items to invoice and Calc Tax
  FOR v_item_record IN 
    SELECT * FROM sales_order_items 
    WHERE sales_order_id = p_sales_order_id
  LOOP
    -- Lookup Current Tax Rate
    SELECT tax_rate INTO v_product_tax_rate FROM products WHERE id = v_item_record.product_id;
    IF v_product_tax_rate IS NULL THEN v_product_tax_rate := 0; END IF;

    -- Recalculate totals to be sure
    v_item_subtotal := v_item_record.quantity * v_item_record.unit_price * (1 - COALESCE(v_item_record.discount_percentage, 0) / 100);
    v_item_tax := v_item_subtotal * (v_product_tax_rate / 100);
    v_item_total := v_item_subtotal + v_item_tax;

    v_calculated_total := v_calculated_total + v_item_total;

    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      quantity,
      unit_price,
      discount_percentage,
      total,
      tax_rate,
      tax_amount
    ) VALUES (
      v_invoice_id,
      v_item_record.product_id,
      v_item_record.quantity,
      v_item_record.unit_price,
      v_item_record.discount_percentage,
      v_item_total, -- Use new total with tax
      v_product_tax_rate,
      v_item_tax
    );
  END LOOP;

  -- Update invoice total
  UPDATE invoices SET total = v_calculated_total WHERE id = v_invoice_id;

  -- Update sales order status
  UPDATE sales_orders
  SET status = 'completed',
      executed_invoice_id = v_invoice_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_sales_order_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
