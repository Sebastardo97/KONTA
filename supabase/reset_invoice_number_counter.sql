-- Reset Invoice Number Counter to 1
-- This script resets the auto-increment sequence for the invoices.number field

-- First, check the current sequence value
-- SELECT pg_get_serial_sequence('invoices', 'number');

-- Reset the sequence to start from 1
-- The sequence is automatically created by PostgreSQL when using SERIAL
ALTER SEQUENCE invoices_number_seq RESTART WITH 1;

-- Verify the reset
-- Next invoice created will have number = 1
SELECT setval('invoices_number_seq', 1, false);

-- Optional: View current sequence value
-- SELECT currval('invoices_number_seq');
