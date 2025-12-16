-- =====================================================
-- INVOICE ENHANCEMENTS
-- =====================================================
-- Adds invoice types (POS/NORMAL), discounts, and 
-- customer improvements
-- =====================================================

-- ADD PHONE2 TO CUSTOMERS
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS phone2 TEXT;

COMMENT ON COLUMN customers.phone2 IS 'Secondary contact phone number';

-- CREATE INVOICE TYPE ENUM
DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('POS', 'NORMAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ADD INVOICE TYPE TO INVOICES TABLE
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_type invoice_type DEFAULT 'POS';

COMMENT ON COLUMN invoices.invoice_type IS 'POS = Legal/DIAN reporting, NORMAL = Internal/Quotes';

-- ADD DISCOUNT PERCENTAGE TO INVOICE_ITEMS
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

COMMENT ON COLUMN invoice_items.discount_percentage IS 'Discount applied to this item (0-100%)';

-- CREATE FUNCTION TO CALCULATE ITEM TOTAL WITH DISCOUNT
CREATE OR REPLACE FUNCTION calculate_invoice_item_total(
  p_unit_price NUMERIC,
  p_quantity INTEGER,
  p_discount_percentage NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(p_unit_price * (1 - p_discount_percentage / 100) * p_quantity, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_invoice_item_total IS 'Calculates item total: unit_price * (1 - discount/100) * quantity';

-- TRIGGER: Auto-calculate invoice_item total with discount
CREATE OR REPLACE FUNCTION auto_calculate_invoice_item_total()
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

DROP TRIGGER IF EXISTS trigger_auto_calculate_invoice_item_total ON invoice_items;
CREATE TRIGGER trigger_auto_calculate_invoice_item_total
  BEFORE INSERT OR UPDATE ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_invoice_item_total();

-- UPDATE RLS POLICIES FOR INVOICES (Sellers can only see their own)
DROP POLICY IF EXISTS "Public read access" ON invoices;

-- Admins can see all invoices
CREATE POLICY "Admins can see all invoices"
  ON invoices
  FOR SELECT
  USING (is_admin());

-- Sellers can only see their own invoices
CREATE POLICY "Sellers can see own invoices"
  ON invoices
  FOR SELECT
  USING (is_seller() AND seller_id = auth.uid());

-- Authenticated users can insert invoices (seller_id will be validated)
CREATE POLICY "Authenticated can insert invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only admins can update invoices, or sellers can update their own drafts
CREATE POLICY "Admins can update all invoices"
  ON invoices
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Sellers can update own draft invoices"
  ON invoices
  FOR UPDATE
  USING (is_seller() AND seller_id = auth.uid() AND status = 'draft');

-- UPDATE RLS POLICIES FOR INVOICE_ITEMS
DROP POLICY IF EXISTS "Public read access" ON invoice_items;

-- Users can read invoice items if they can read the invoice
CREATE POLICY "Users can read invoice items"
  ON invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id
      AND (is_admin() OR (is_seller() AND invoices.seller_id = auth.uid()))
    )
  );

-- Users can insert invoice items if they can access the invoice
CREATE POLICY "Users can insert invoice items"
  ON invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id
      AND (is_admin() OR (is_seller() AND invoices.seller_id = auth.uid()))
    )
  );

-- CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type_seller ON invoices(invoice_type, seller_id);
