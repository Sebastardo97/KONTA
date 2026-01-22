
-- Function to get global inventory statistics
-- This bypasses PostgREST row limits and is more efficient
CREATE OR REPLACE FUNCTION get_inventory_stats()
RETURNS TABLE (
    total_count BIGINT,
    total_value NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_count,
        COALESCE(SUM(price * stock), 0)::NUMERIC as total_value
    FROM products;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_inventory_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_stats() TO anon; -- If needed for public view, but better limited to authenticated
