
DROP POLICY IF EXISTS "Owner read own evidence" ON storage.objects;
CREATE POLICY "Owner read own evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='evidence' AND public.owns_founder(auth.uid(), (split_part(name,'/',1))::uuid));

DROP POLICY IF EXISTS "Owner upload own evidence" ON storage.objects;
CREATE POLICY "Owner upload own evidence" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='evidence' AND public.owns_founder(auth.uid(), (split_part(name,'/',1))::uuid));

DROP POLICY IF EXISTS "Owner delete own evidence" ON storage.objects;
CREATE POLICY "Owner delete own evidence" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='evidence' AND public.owns_founder(auth.uid(), (split_part(name,'/',1))::uuid));

DROP POLICY IF EXISTS "Staff read all evidence" ON storage.objects;
CREATE POLICY "Staff read all evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='evidence' AND public.is_staff(auth.uid()));
