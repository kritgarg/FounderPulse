
-- Tighten SELECT policies: restrict to faculty/admin staff (or own row) instead of all authenticated

-- founders
DROP POLICY IF EXISTS "Authenticated can view founders" ON public.founders;
CREATE POLICY "Staff can view founders" ON public.founders
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- evaluations
DROP POLICY IF EXISTS "Authenticated can view evaluations" ON public.evaluations;
CREATE POLICY "Staff can view evaluations" ON public.evaluations
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- monthly_submissions
DROP POLICY IF EXISTS "Authenticated can view submissions" ON public.monthly_submissions;
CREATE POLICY "Staff can view submissions" ON public.monthly_submissions
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- mentor_observations
DROP POLICY IF EXISTS "Authenticated can view observations" ON public.mentor_observations;
CREATE POLICY "Staff can view observations" ON public.mentor_observations
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- mentor_assignments
DROP POLICY IF EXISTS "Authenticated can view assignments" ON public.mentor_assignments;
CREATE POLICY "Staff can view assignments" ON public.mentor_assignments
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- profiles: own row, admins see all
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_roles: own row already covered, admins see all
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Ensure is_staff returns true for both super_admin and faculty (faculty has view-only access)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','faculty')
  )
$function$;
