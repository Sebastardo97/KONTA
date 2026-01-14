-- =====================================================
-- SECURITY FIX: Enable RLS on Views
-- =====================================================
-- Warning: "Security Definier View"
-- Fix: Add "WITH (security_invoker = true)" to enforce RLS for the user querying the view.

-- 1. Fix monthly_seller_viaticos
CREATE OR REPLACE VIEW monthly_seller_viaticos 
WITH (security_invoker = true) 
AS
SELECT 
  p.full_name as seller_name,
  p.email as seller_email,
  TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') as month,
  SUM(e.amount) as total_viaticos,
  COUNT(e.id) as expense_count
FROM expenses e
JOIN profiles p ON p.id = e.user_id
WHERE e.category = 'viaticos'
GROUP BY p.full_name, p.email, DATE_TRUNC('month', e.date)
ORDER BY month DESC, total_viaticos DESC;

-- 2. Fix monthly_general_expenses
CREATE OR REPLACE VIEW monthly_general_expenses 
WITH (security_invoker = true) 
AS
SELECT 
  category,
  TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as month,
  SUM(amount) as total_amount,
  COUNT(id) as transaction_count
FROM expenses
GROUP BY category, DATE_TRUNC('month', date)
ORDER BY month DESC, total_amount DESC;
