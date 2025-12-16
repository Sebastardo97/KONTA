-- =====================================================
-- SELLER PERFORMANCE TRACKING
-- =====================================================
-- Views and functions for tracking seller sales performance
-- =====================================================

-- VIEW: Sales by Seller
-- Aggregates sales data by seller for quick reporting
CREATE OR REPLACE VIEW sales_by_seller AS
SELECT 
  p.id as seller_id,
  p.full_name as seller_name,
  p.email as seller_email,
  s.is_active,
  COUNT(DISTINCT i.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN i.invoice_type = 'POS' THEN i.id END) as pos_invoices,
  COUNT(DISTINCT CASE WHEN i.invoice_type = 'NORMAL' THEN i.id END) as normal_invoices,
  COALESCE(SUM(i.total), 0) as total_sales,
  COALESCE(SUM(CASE WHEN i.invoice_type = 'POS' THEN i.total ELSE 0 END), 0) as pos_sales,
  COALESCE(SUM(CASE WHEN i.invoice_type = 'NORMAL' THEN i.total ELSE 0 END), 0) as normal_sales,
  COALESCE(AVG(i.total), 0) as average_invoice_value,
  MIN(i.date) as first_sale_date,
  MAX(i.date) as last_sale_date
FROM profiles p
LEFT JOIN sellers s ON s.user_id = p.id
LEFT JOIN invoices i ON i.seller_id = p.id AND i.status IN ('paid', 'reported_dian')
WHERE p.role = 'seller'
GROUP BY p.id, p.full_name, p.email, s.is_active;

COMMENT ON VIEW sales_by_seller IS 'Aggregated sales statistics by seller';

-- FUNCTION: Get seller performance for a date range
CREATE OR REPLACE FUNCTION get_seller_performance(
  p_seller_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  invoice_count BIGINT,
  pos_count BIGINT,
  normal_count BIGINT,
  total_sales NUMERIC,
  pos_sales NUMERIC,
  normal_sales NUMERIC,
  avg_invoice_value NUMERIC,
  top_products JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT i.id)::BIGINT as invoice_count,
    COUNT(DISTINCT CASE WHEN i.invoice_type = 'POS' THEN i.id END)::BIGINT as pos_count,
    COUNT(DISTINCT CASE WHEN i.invoice_type = 'NORMAL' THEN i.id END)::BIGINT as normal_count,
    COALESCE(SUM(i.total), 0) as total_sales,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'POS' THEN i.total ELSE 0 END), 0) as pos_sales,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'NORMAL' THEN i.total ELSE 0 END), 0) as normal_sales,
    COALESCE(AVG(i.total), 0) as avg_invoice_value,
    (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'product_id', p.id,
          'product_name', p.name,
          'quantity_sold', SUM(ii.quantity),
          'total_revenue', SUM(ii.total)
        ) ORDER BY SUM(ii.total) DESC
      )
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id IN (
        SELECT id FROM invoices 
        WHERE seller_id = p_seller_id 
        AND date >= p_start_date 
        AND date <= p_end_date
        AND status IN ('paid', 'reported_dian')
      )
      GROUP BY p.id, p.name
      LIMIT 10
    ) as top_products
  FROM invoices i
  WHERE i.seller_id = p_seller_id
    AND i.date >= p_start_date
    AND i.date <= p_end_date
    AND i.status IN ('paid', 'reported_dian');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_seller_performance IS 'Returns detailed performance metrics for a seller in a date range';

-- FUNCTION: Get monthly sales comparison for seller
CREATE OR REPLACE FUNCTION get_seller_monthly_sales(
  p_seller_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  month_year TEXT,
  invoice_count BIGINT,
  total_sales NUMERIC,
  pos_sales NUMERIC,
  normal_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', i.date), 'YYYY-MM') as month_year,
    COUNT(DISTINCT i.id)::BIGINT as invoice_count,
    COALESCE(SUM(i.total), 0) as total_sales,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'POS' THEN i.total ELSE 0 END), 0) as pos_sales,
    COALESCE(SUM(CASE WHEN i.invoice_type = 'NORMAL' THEN i.total ELSE 0 END), 0) as normal_sales
  FROM invoices i
  WHERE i.seller_id = p_seller_id
    AND i.date >= DATE_TRUNC('month', CURRENT_DATE) - (p_months || ' months')::INTERVAL
    AND i.status IN ('paid', 'reported_dian')
  GROUP BY DATE_TRUNC('month', i.date)
  ORDER BY DATE_TRUNC('month', i.date) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_seller_monthly_sales IS 'Returns monthly sales breakdown for a seller';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_seller_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_monthly_sales TO authenticated;
