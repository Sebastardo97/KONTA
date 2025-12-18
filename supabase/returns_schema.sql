-- =====================================================
-- RETURNS AND CREDIT NOTES SYSTEM
-- =====================================================

-- CREDIT NOTES TABLE
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  number SERIAL, -- Auto-incrementing number for the credit note
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  reason TEXT NOT NULL,
  total NUMERIC NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CREDIT NOTE ITEMS TABLE
CREATE TABLE IF NOT EXISTS credit_note_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  credit_note_id UUID REFERENCES credit_notes(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

-- Read policies (similar to invoices)
CREATE POLICY "Public read access" ON credit_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read access" ON credit_note_items FOR SELECT USING (auth.role() = 'authenticated');

-- Write policies (only authenticated users, ideally sellers/admins)
CREATE POLICY "Authenticated insert" ON credit_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert" ON credit_note_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- FUNCTION: Process Return
-- 1. Creates Credit Note
-- 2. Creates Credit Note Items
-- 3. Increments Stock
CREATE OR REPLACE FUNCTION process_return(
  p_invoice_id UUID,
  p_items JSONB, -- Array of objects: { product_id, quantity, unit_price }
  p_reason TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_credit_note_id UUID;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_item_total NUMERIC;
  v_current_stock INTEGER;
BEGIN
  -- Calculate total from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;
    v_total := v_total + v_item_total;
  END LOOP;

  -- Create Credit Note
  INSERT INTO credit_notes (
    invoice_id,
    reason,
    total,
    created_by
  ) VALUES (
    p_invoice_id,
    p_reason,
    v_total,
    p_user_id
  ) RETURNING id INTO v_credit_note_id;

  -- Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_total := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC;

    -- Create Credit Note Item
    INSERT INTO credit_note_items (
      credit_note_id,
      product_id,
      quantity,
      unit_price,
      total
    ) VALUES (
      v_credit_note_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      v_item_total
    );

    -- Increment Stock
    -- We assume increment_stock function exists (checked previously)
    PERFORM increment_stock(
        (v_item->>'product_id')::UUID, 
        (v_item->>'quantity')::INTEGER
    );
    
  END LOOP;

  RETURN v_credit_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
