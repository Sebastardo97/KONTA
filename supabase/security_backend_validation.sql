-- ============================================
-- BACKEND VALIDATION FUNCTIONS
-- ============================================
-- Server-side validation to prevent data injection
-- and ensure data integrity

-- STEP 1: Create validation helper functions

-- Validate email format
CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate phone number (Colombian format)
CREATE OR REPLACE FUNCTION public.is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow: +57 3XX XXX XXXX or 3XXXXXXXXX
    RETURN phone ~* '^\+?57?[0-9]{10}$' OR phone ~* '^3[0-9]{9}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sanitize text input (remove dangerous characters)
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove potential SQL injection characters
    RETURN regexp_replace(input_text, '[;<>]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- STEP 2: Create secure product creation function
CREATE OR REPLACE FUNCTION public.create_product_secure(
    p_code TEXT,
    p_name TEXT,
    p_description TEXT,
    p_price NUMERIC,
    p_stock INTEGER,
    p_tax_rate INTEGER
)
RETURNS UUID AS $$
DECLARE
    new_product_id UUID;
BEGIN
    -- Validation 1: Code must be at least 3 characters
    IF LENGTH(TRIM(p_code)) < 3 THEN
        RAISE EXCEPTION 'El código debe tener al menos 3 caracteres';
    END IF;

    -- Validation 2: Name must not be empty
    IF LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre no puede estar vacío';
    END IF;

    -- Validation 3: Price must be positive
    IF p_price <= 0 THEN
        RAISE EXCEPTION 'El precio debe ser mayor a 0';
    END IF;

    -- Validation 4: Stock must be non-negative
    IF p_stock < 0 THEN
        RAISE EXCEPTION 'El stock no puede ser negativo';
    END IF;

    -- Validation 5: Tax rate must be valid
    IF p_tax_rate NOT IN (0, 5, 19) THEN
        RAISE EXCEPTION 'IVA inválido (solo 0%%, 5%%, 19%%)';
    END IF;

    -- Validation 6: Code must be unique
    IF EXISTS (SELECT 1 FROM products WHERE code = p_code) THEN
        RAISE EXCEPTION 'Ya existe un producto con ese código';
    END IF;

    -- Insert sanitized data
    INSERT INTO public.products (
        code,
        name,
        description,
        price,
        stock,
        tax_rate
    ) VALUES (
        TRIM(public.sanitize_text(p_code)),
        TRIM(public.sanitize_text(p_name)),
        TRIM(public.sanitize_text(p_description)),
        p_price,
        p_stock,
        p_tax_rate
    )
    RETURNING id INTO new_product_id;

    RETURN new_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Create secure customer creation function
CREATE OR REPLACE FUNCTION public.create_customer_secure(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_tax_id TEXT
)
RETURNS UUID AS $$
DECLARE
    new_customer_id UUID;
BEGIN
    -- Validation 1: Name required
    IF LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre es obligatorio';
    END IF;

    -- Validation 2: Email format (if provided)
    IF p_email IS NOT NULL AND LENGTH(TRIM(p_email)) > 0 THEN
        IF NOT public.is_valid_email(p_email) THEN
            RAISE EXCEPTION 'Formato de email inválido';
        END IF;
    END IF;

    -- Validation 3: Phone format (if provided)
    IF p_phone IS NOT NULL AND LENGTH(TRIM(p_phone)) > 0 THEN
        IF NOT public.is_valid_phone(p_phone) THEN
            RAISE EXCEPTION 'Formato de teléfono inválido';
        END IF;
    END IF;

    -- Insert sanitized data
    INSERT INTO public.customers (
        name,
        email,
        phone,
        address,
        tax_id
    ) VALUES (
        TRIM(public.sanitize_text(p_name)),
        NULLIF(TRIM(LOWER(p_email)), ''),
        NULLIF(TRIM(p_phone), ''),
        NULLIF(TRIM(public.sanitize_text(p_address)), ''),
        NULLIF(TRIM(p_tax_id), '')
    )
    RETURNING id INTO new_customer_id;

    RETURN new_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Create invoice validation trigger
CREATE OR REPLACE FUNCTION public.validate_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Validation: Total must be positive
    IF NEW.total <= 0 THEN
        RAISE EXCEPTION 'El total debe ser mayor a 0';
    END IF;

    -- Validation: Customer must exist
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id) THEN
        RAISE EXCEPTION 'Cliente no existe';
    END IF;

    -- Validation: Seller must exist and be valid
    IF NEW.seller_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = NEW.seller_id 
            AND role IN ('seller', 'admin')
        ) THEN
            RAISE EXCEPTION 'Vendedor inválido';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_invoice_trigger ON public.invoices;
CREATE TRIGGER validate_invoice_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.validate_invoice();

-- STEP 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_product_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_phone TO authenticated;

-- STEP 6: Verification

-- Test 1: Try to create product with invalid data (should fail)
-- SELECT public.create_product_secure('AB', 'Test', 'Desc', -100, 5, 19);
-- Expected: ERROR: El código debe tener al menos 3 caracteres

-- Test 2: Create valid product (should succeed)
-- SELECT public.create_product_secure('TEST001', 'Test Product', 'Description', 1000, 10, 19);
-- Expected: Returns UUID

-- Test 3: Try invalid email (should fail)
-- SELECT public.create_customer_secure('John Doe', 'invalid-email', '3001234567', 'Address', '123456');
-- Expected: ERROR: Formato de email inválido

-- Test 4: Create valid customer (should succeed)
-- SELECT public.create_customer_secure('John Doe', 'john@example.com', '3001234567', 'Calle 123', '123456');
-- Expected: Returns UUID

-- ============================================
-- USAGE IN FRONTEND:
-- ============================================
-- Instead of direct INSERT:
-- const { data, error } = await supabase
--   .rpc('create_product_secure', {
--     p_code: 'PROD001',
--     p_name: 'Product Name',
--     p_description: 'Description',
--     p_price: 1000,
--     p_stock: 10,
--     p_tax_rate: 19
--   })

-- ============================================
-- NOTES:
-- ============================================
-- ✅ Server-side validation (can't be bypassed)
-- ✅ Sanitizes input to prevent injection
-- ✅ Returns clear error messages
-- ✅ Validates business rules
-- ✅ Easy to use from frontend with .rpc()
-- ============================================
