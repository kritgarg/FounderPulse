
-- 1) user_roles: explicit restrictive INSERT/UPDATE/DELETE — only admins
CREATE POLICY "Restrict role inserts to admins"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Restrict role updates to admins"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Restrict role deletes to admins"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2) kpi_snapshots: admin-only writes
CREATE POLICY "Admin manages kpi snapshots"
  ON public.kpi_snapshots FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3) monthly_submissions: owner can insert/update their own
CREATE POLICY "Owner inserts own monthly submission"
  ON public.monthly_submissions FOR INSERT TO authenticated
  WITH CHECK (public.owns_founder(auth.uid(), founder_id));

CREATE POLICY "Owner updates own monthly submission"
  ON public.monthly_submissions FOR UPDATE TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id))
  WITH CHECK (public.owns_founder(auth.uid(), founder_id));

CREATE POLICY "Owner views own monthly submission"
  ON public.monthly_submissions FOR SELECT TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id));

-- 4) Storage: explicit UPDATE policy on evidence (owner only)
CREATE POLICY "Owner update own evidence"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evidence' AND public.owns_founder(auth.uid(), (split_part(name, '/', 1))::uuid))
  WITH CHECK (bucket_id = 'evidence' AND public.owns_founder(auth.uid(), (split_part(name, '/', 1))::uuid));
