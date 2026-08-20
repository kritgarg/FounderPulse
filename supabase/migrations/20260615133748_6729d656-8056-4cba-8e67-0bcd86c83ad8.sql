
-- 1. Lock signups to @newtonschool.co and auto-grant admin to Nitish
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(NEW.email);
BEGIN
  IF v_email !~ '@newtonschool\.co$' THEN
    RAISE EXCEPTION 'Only @newtonschool.co email addresses are allowed';
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF v_email = 'nitish.venkatraman@newtonschool.co' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Everyone else: view-only (faculty role, but writes are blocked by policies below)
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'faculty')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill: if Nitish already exists, promote; demote any other super_admins to faculty
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'nitish.venkatraman@newtonschool.co' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'super_admin') ON CONFLICT DO NOTHING;
  END IF;

  DELETE FROM public.user_roles
  WHERE role = 'super_admin'
    AND user_id <> COALESCE(v_uid, '00000000-0000-0000-0000-000000000000'::uuid);
END $$;

-- 3. Helper: is_admin (only Nitish via super_admin role)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'super_admin'::app_role) $$;

-- 4. Rewrite policies: writes -> admin only; reads -> any authenticated Newton user
-- founders
DROP POLICY IF EXISTS "Staff manage founders" ON public.founders;
DROP POLICY IF EXISTS "Founder reads own" ON public.founders;
DROP POLICY IF EXISTS "Founder updates own" ON public.founders;
DROP POLICY IF EXISTS "Mentor reads assigned founders" ON public.founders;
CREATE POLICY "Authenticated can view founders" ON public.founders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages founders" ON public.founders FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- evaluations
DROP POLICY IF EXISTS "Staff manage evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Founder reads own evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Mentor reads assigned evaluations" ON public.evaluations;
CREATE POLICY "Authenticated can view evaluations" ON public.evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages evaluations" ON public.evaluations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- monthly_submissions
DROP POLICY IF EXISTS "Staff manage submissions" ON public.monthly_submissions;
DROP POLICY IF EXISTS "Founder manages own submissions" ON public.monthly_submissions;
DROP POLICY IF EXISTS "Mentor reads assigned submissions" ON public.monthly_submissions;
CREATE POLICY "Authenticated can view submissions" ON public.monthly_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages submissions" ON public.monthly_submissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- mentor_observations
DROP POLICY IF EXISTS "Staff read observations" ON public.mentor_observations;
DROP POLICY IF EXISTS "Mentor manage own observations" ON public.mentor_observations;
DROP POLICY IF EXISTS "Founder reads own observations" ON public.mentor_observations;
CREATE POLICY "Authenticated can view observations" ON public.mentor_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages observations" ON public.mentor_observations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- mentor_assignments
DROP POLICY IF EXISTS "Staff manage assignments" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Mentor reads own assignments" ON public.mentor_assignments;
CREATE POLICY "Authenticated can view assignments" ON public.mentor_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages assignments" ON public.mentor_assignments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- profiles: everyone can read, only admin can write (besides self)
DROP POLICY IF EXISTS "Staff manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles: read all (for admin UI visibility), write only admin (already enforced)
-- Existing "Admins manage roles" + "Staff read all roles" + "Users see own roles" stay; tighten read to authenticated
DROP POLICY IF EXISTS "Staff read all roles" ON public.user_roles;
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
