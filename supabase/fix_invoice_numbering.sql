-- FIX BUG #1: Numeración Consecutiva de Facturas
-- Sistema de numeración legal para DIAN Colombia

-- Step 1: Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Step 2: Add 'number' column to invoices table if it doesn't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS number INTEGER UNIQUE;

-- Step 3: Create function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    NEW.number := nextval('invoice_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to call function before insert
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Step 5: Update existing invoices with sequential numbers
-- Only if they don't have a number yet
WITH numbered_invoices AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM invoices
  WHERE number IS NULL
)
UPDATE invoices
SET number = numbered_invoices.new_number
FROM numbered_invoices
WHERE invoices.id = numbered_invoices.id;

-- Step 6: Reset sequence to continue from max existing number
SELECT setval('invoice_number_seq', COALESCE((SELECT MAX(number) FROM invoices), 0) + 1, false);

-- Step 7: Make number NOT NULL after populating
ALTER TABLE invoices 
ALTER COLUMN number SET NOT NULL;

-- Verify
SELECT id, number, invoice_type, total, created_at 
FROM invoices 
ORDER BY number DESC 
LIMIT 10;
