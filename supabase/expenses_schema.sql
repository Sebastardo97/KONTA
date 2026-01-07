-- =====================================================
-- EXPENSES MODULE (GASTOS)
-- =====================================================
-- System for tracking non-inventory expenses like 'Viáticos' and 'Varios'.
-- =====================================================

-- 1. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('viaticos', 'varios', 'nomina', 'servicios', 'arriendo', 'mantenimiento', 'otros')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  user_id UUID REFERENCES auth.users(id), -- User responsible for the expense (e.g., the seller for 'viaticos')
  evidence_url TEXT, -- URL to receipt image
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(), -- Admin/User who entered the record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- 3. RLS POLICIES
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to expenses"
  ON expenses
  FOR ALL
  USING (is_admin());

-- Sellers can see their OWN viaticos/expenses
CREATE POLICY "Sellers view own expenses"
  ON expenses
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. VIEWS FOR REPORTING

-- VIEW A: Viaticos by Seller (Monthly)
-- Answers: "How much did Juan spend on Viaticos in January?"
CREATE OR REPLACE VIEW monthly_seller_viaticos AS
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

-- VIEW B: General Expenses Monthly Report
-- Answers: "How much did we spend on Varios vs Arriendo in January?"
CREATE OR REPLACE VIEW monthly_general_expenses AS
SELECT 
  category,
  TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as month,
  SUM(amount) as total_amount,
  COUNT(id) as transaction_count
FROM expenses
GROUP BY category, DATE_TRUNC('month', date)
ORDER BY month DESC, total_amount DESC;

-- COMMENTS
COMMENT ON TABLE expenses IS 'Operational expenses distinct from inventory purchases (e.g. Viaticos, Varios)';
COMMENT ON COLUMN expenses.user_id IS 'The person responsible for the expense. For Viaticos, this is the seller.';
