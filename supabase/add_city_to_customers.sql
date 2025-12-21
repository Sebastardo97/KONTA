-- Migration: Add city column to customers table

ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
