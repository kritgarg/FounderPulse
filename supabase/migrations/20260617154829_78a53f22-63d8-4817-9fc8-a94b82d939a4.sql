
-- Remove any super_admin role from users other than Nitish
DELETE FROM public.user_roles
WHERE role = 'super_admin'
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'nitish.venkatraman@newtonschool.co'
  );

-- Enforce at the database layer: only Nitish's auth user can hold the super_admin role
CREATE OR REPLACE FUNCTION public.enforce_single_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.role = 'super_admin'::app_role THEN
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS DISTINCT FROM 'nitish.venkatraman@newtonschool.co' THEN
      RAISE EXCEPTION 'super_admin role is reserved for nitish.venkatraman@newtonschool.co';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_super_admin_trg ON public.user_roles;
CREATE TRIGGER enforce_single_super_admin_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_super_admin();
