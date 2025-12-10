-- Add missing fields to company_settings
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS city text;
