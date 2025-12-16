-- =====================================================
-- SALES ORDERS (PREVENTAS)
-- =====================================================
-- System for admin to create pre-sales that sellers execute
-- =====================================================

-- SALES ORDERS TABLE
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  number SERIAL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  customer_id UUID REFERENCES customers(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL, -- Admin who created it
  assigned_to UUID REFERENCES auth.users(id), -- Seller assigned to execute
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled')),
  notes TEXT,
  invoice_type invoice_type DEFAULT 'POS', -- What type of invoice to create when executed
  executed_invoice_id UUID REFERENCES invoices(id), -- Invoice created when executed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SALES ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  discount_percentage NUMERIC DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_assigned_to ON sales_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON sales_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON sales_order_items(sales_order_id);

-- TRIGGER: Auto-calculate sales_order_item total with discount
CREATE OR REPLACE FUNCTION auto_calculate_sales_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := calculate_invoice_item_total(
    NEW.unit_price, 
    NEW.quantity, 
    COALESCE(NEW.discount_percentage, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_sales_order_item_total
  BEFORE INSERT OR UPDATE ON sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_sales_order_item_total();

-- TRIGGER: Update sales_order total when items change
CREATE OR REPLACE FUNCTION update_sales_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sales_orders
  SET total = (
    SELECT COALESCE(SUM(total), 0)
    FROM sales_order_items
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
  )
  WHERE id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_order_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_order_total();

-- TRIGGER: Update updated_at timestamp
CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION: Execute sales order (convert to invoice)
CREATE OR REPLACE FUNCTION execute_sales_order(
  p_sales_order_id UUID,
  p_executor_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_order_record RECORD;
  v_item_record RECORD;
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

  -- Create invoice
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
    v_order_record.total,
    v_order_record.invoice_type,
    'draft',
    timezone('utc'::text, now())
  ) RETURNING id INTO v_invoice_id;

  -- Copy items to invoice
  FOR v_item_record IN 
    SELECT * FROM sales_order_items 
    WHERE sales_order_id = p_sales_order_id
  LOOP
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      quantity,
      unit_price,
      discount_percentage,
      total
    ) VALUES (
      v_invoice_id,
      v_item_record.product_id,
      v_item_record.quantity,
      v_item_record.unit_price,
      v_item_record.discount_percentage,
      v_item_record.total
    );
  END LOOP;

  -- Update sales order status
  UPDATE sales_orders
  SET status = 'completed',
      executed_invoice_id = v_invoice_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_sales_order_id;

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with sales orders
CREATE POLICY "Admins full access to sales orders"
  ON sales_orders
  FOR ALL
  USING (is_admin());

-- Sellers can only see orders assigned to them
CREATE POLICY "Sellers can see assigned orders"
  ON sales_orders
  FOR SELECT
  USING (is_seller() AND assigned_to = auth.uid());

-- Sellers can update orders assigned to them (to execute)
CREATE POLICY "Sellers can execute assigned orders"
  ON sales_orders
  FOR UPDATE
  USING (is_seller() AND assigned_to = auth.uid() AND status IN ('pending', 'assigned'));

-- Sales order items follow the same rules as their parent order
CREATE POLICY "Users can read order items if they can read order"
  ON sales_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_items.sales_order_id
      AND (is_admin() OR (is_seller() AND sales_orders.assigned_to = auth.uid()))
    )
  );

CREATE POLICY "Admins can manage order items"
  ON sales_order_items
  FOR ALL
  USING (is_admin());

-- COMMENTS
COMMENT ON TABLE sales_orders IS 'Pre-sales created by admin for sellers to execute';
COMMENT ON COLUMN sales_orders.status IS 'pending: created, assigned: seller notified, completed: converted to invoice, cancelled: not executed';
COMMENT ON FUNCTION execute_sales_order IS 'Converts a sales order into an invoice';
