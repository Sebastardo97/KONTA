-- 1. Create a function to sync role changes to auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_role_update() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_role_change ON public.profiles;
CREATE TRIGGER on_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_role_update();

-- 3. One-time sync for existing users
DO $$
DECLARE
  profile_record record;
BEGIN
  FOR profile_record IN SELECT id, role FROM public.profiles
  LOOP
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END;
$$;
