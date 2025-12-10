-- Allow authenticated users to MANAGE CUSTOMERS
create policy "Authenticated insert customer" on customers for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update customer" on customers for update using (auth.role() = 'authenticated');
create policy "Authenticated delete customer" on customers for delete using (auth.role() = 'authenticated');

-- Allow authenticated users to MANAGE INVOICES
create policy "Authenticated insert invoice" on invoices for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update invoice" on invoices for update using (auth.role() = 'authenticated');

-- Allow authenticated users to MANAGE INVOICE ITEMS
create policy "Authenticated insert invoice_items" on invoice_items for insert with check (auth.role() = 'authenticated');

-- Allow authenticated users to MANAGE COMPANY SETTINGS
create policy "Authenticated insert company_settings" on company_settings for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update company_settings" on company_settings for update using (auth.role() = 'authenticated');
