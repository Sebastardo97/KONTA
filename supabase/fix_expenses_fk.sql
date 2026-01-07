-- Add explicit Foreign Key to profiles to enable PostgREST embedding
-- This allows: .select('*, profiles:user_id(full_name)')
ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_user_id_fkey, -- Drop old FK to auth.users if it conflicts or just to be clean (though we can have multiple, usually best to point to profiles for public API)
ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
