-- Create a default 'Cliente General' if it doesn't exist
INSERT INTO customers (name, nit_cedula, address, phone, email)
SELECT 'Cliente General', '222222222222', 'Local', 'N/A', 'general@example.com'
WHERE NOT EXISTS (
    SELECT 1 FROM customers WHERE nit_cedula = '222222222222'
);
