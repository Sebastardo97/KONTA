-- Fix for Supabase Security Advisor warning: "View public.sales_by_seller is defined with the SECURITY DEFINER property"
-- This migration recreates the view with security_invoker = true, ensuring it respects the RLS policies of the querying user.

DROP VIEW IF EXISTS sales_by_seller;

CREATE OR REPLACE VIEW sales_by_seller 
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW sales_by_seller IS 'Aggregated sales statistics by seller (Security Invoker)';
