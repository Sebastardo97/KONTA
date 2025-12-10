-- SUPPLIERS TABLE
create table if not exists suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  nit_cedula text unique,
  email text,
  phone text,
  address text,
  city text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PURCHASES TABLE (Gastos / Compras)
create table if not exists purchases (
  id uuid default uuid_generate_v4() primary key,
  number serial, 
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  supplier_id uuid references suppliers(id),
  buyer_id uuid references auth.users(id), -- User who registered the purchase
  total numeric not null default 0,
  status text default 'completed' check (status in ('draft', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PURCHASE ITEMS
create table if not exists purchase_items (
  id uuid default uuid_generate_v4() primary key,
  purchase_id uuid references purchases(id) on delete cascade not null,
  product_id uuid references products(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  total_cost numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table suppliers enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;

-- Allow authenticated users (all sellers/admins for now) to access
create policy "Enable all for authenticated" on suppliers for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on purchases for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated" on purchase_items for all using (auth.role() = 'authenticated');

-- AUTOMATIC STOCK INCREMENT TRIGGER
-- When a purchase item is added, INCREASE the stock of the product.
create or replace function increment_stock_on_purchase()
returns trigger as $$
begin
  update products
  set stock = stock + NEW.quantity
  where id = NEW.product_id;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace trigger on_purchase_item_insert
after insert on purchase_items
for each row execute procedure increment_stock_on_purchase();

-- REVERSE STOCK ON DELETE (Optional but good practice if a line item is removed)
create or replace function decrement_stock_on_purchase_delete()
returns trigger as $$
begin
  update products
  set stock = stock - OLD.quantity
  where id = OLD.product_id;
  return OLD;
end;
$$ language plpgsql security definer;

create or replace trigger on_purchase_item_delete
after delete on purchase_items
for each row execute procedure decrement_stock_on_purchase_delete();
