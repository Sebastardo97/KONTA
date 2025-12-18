# Database Migrations - Execution Order

These SQL migrations must be executed in the following order on your Supabase database:

## Order of Execution

1. **role_based_access.sql** - Creates sellers table, role helper functions, and RLS policies
2. **invoice_enhancements.sql** - Adds invoice types, discounts, and customer improvements  
3. **sales_orders.sql** - Creates sales orders (pre-sales) system
4. **seller_performance.sql** - Creates performance tracking views and functions
5. **returns_schema.sql** - Creates tables and functions for returns and credit notes

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each file in order
4. Click "Run" for each one

### Option 2: Command Line (if you have Supabase CLI)
```bash
supabase db reset  # Optional: if you want to start fresh
supabase db push
```

## Important Notes

⚠️ **BEFORE RUNNING:**
- Backup your database if this is production
- These migrations add new columns and tables but DON'T delete existing data
- The `profiles` table already has a `role` field from the original schema

✅ **AFTER RUNNING:**
- You'll have new tables: `sellers`, `sales_orders`, `sales_order_items`
- New columns: `customers.phone2`, `invoices.invoice_type`, `invoice_items.discount_percentage`
- New functions: `get_user_role()`, `is_admin()`, `is_seller()`, `execute_sales_order()`, etc.
- Updated RLS policies that enforce seller restrictions

## Testing the Migrations

After running, test with these queries:

```sql
-- Check if seller functions work
SELECT get_user_role();
SELECT is_admin();
SELECT is_seller();

-- View sales by seller
SELECT * FROM sales_by_seller;

-- Test discount calculation
SELECT calculate_invoice_item_total(100, 2, 20);  -- Should return 160 (20% off)
```

## Rollback (if needed)

If something goes wrong, you can rollback by:

```sql
-- Drop new tables
DROP TABLE IF EXISTS sales_order_items CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS sellers CASCADE;

-- Drop new columns (be careful!)
ALTER TABLE customers DROP COLUMN IF EXISTS phone2;
ALTER TABLE invoices DROP COLUMN IF EXISTS invoice_type;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS discount_percentage;

-- Drop functions
DROP FUNCTION IF EXISTS execute_sales_order CASCADE;
DROP FUNCTION IF EXISTS get_seller_performance CASCADE;
DROP FUNCTION IF EXISTS get_seller_monthly_sales CASCADE;
```
