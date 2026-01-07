-- =================================================================
-- FIX: Security Warning - Missing Search Path in Security Definer
-- =================================================================
-- Supabase warns about functions with SECURITY DEFINER that do not
-- have a fixed search_path. This allows potential privilege escalation.
--
-- This script fixes the remaining functions identified:
-- 1. create_pos_invoice (POS transaction)
-- 2. process_return (Returns/Credit Notes)
-- 3. handle_role_update (Role syncing)
-- =================================================================

-- 1. Fix create_pos_invoice
-- Matches signature in fix_pos_security.sql
ALTER FUNCTION public.create_pos_invoice(UUID, UUID, JSONB, NUMERIC, TEXT)
SET search_path = public, pg_temp;

-- 2. Fix process_return
-- Matches signature in returns_schema.sql
ALTER FUNCTION public.process_return(UUID, JSONB, TEXT, UUID)
SET search_path = public, pg_temp;

-- 3. Fix handle_role_update
-- Matches signature in middleware_optimization.sql
ALTER FUNCTION public.handle_role_update()
SET search_path = public, pg_temp;

-- =================================================================
-- VERIFICATION
-- =================================================================
-- Run this to check if any other public functions are missing search_path:
--
-- SELECT n.nspname, p.proname, p.prosecdef, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true
--   AND (p.proconfig IS NULL OR NOT (p.proconfig @> '{search_path=public,pg_temp}'));
