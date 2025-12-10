-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'seller' check (role in ('admin', 'seller')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PRODUCTS
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sku text unique,
  price numeric not null,
  stock integer default 0,
  tax_rate numeric default 19.0, -- Colombia VAT default
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CUSTOMERS
create table customers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  nit_cedula text unique not null, -- ID number
  email text,
  phone text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INVOICES
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  number serial, -- Simple auto-increment for internal use, DIAN might need specific logic
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  customer_id uuid references customers(id),
  seller_id uuid references profiles(id),
  total numeric not null,
  status text default 'draft' check (status in ('draft', 'paid', 'reported_dian', 'cancelled')),
  dian_cufe text, -- Unique Electronic Invoice Code
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INVOICE ITEMS
create table invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references invoices(id) on delete cascade not null,
  product_id uuid references products(id),
  quantity integer not null,
  unit_price numeric not null,
  total numeric not null
);

-- COMPANY SETTINGS
create table company_settings (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  nit text not null,
  resolution_number text,
  logo_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Basic setup)
alter table profiles enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table company_settings enable row level security;

-- Allow read access to authenticated users
create policy "Public read access" on products for select using (auth.role() = 'authenticated');
create policy "Public read access" on customers for select using (auth.role() = 'authenticated');
create policy "Public read access" on invoices for select using (auth.role() = 'authenticated');
create policy "Public read access" on invoice_items for select using (auth.role() = 'authenticated');
create policy "Public read access" on company_settings for select using (auth.role() = 'authenticated');

-- Allow write access to authenticated users (refine later for admin vs seller)
create policy "Authenticated insert" on products for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update" on products for update using (auth.role() = 'authenticated');
