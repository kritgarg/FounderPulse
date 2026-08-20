
ALTER VIEW public.founder_meeting_assignments SET (security_invoker = on);

CREATE POLICY "dossier files staff read" ON storage.objects FOR SELECT
  USING (bucket_id='dossiers' AND public.is_staff(auth.uid()));
CREATE POLICY "dossier files owner read" ON storage.objects FOR SELECT
  USING (
    bucket_id='dossiers'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.founder_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "dossier files staff insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='dossiers' AND public.is_staff(auth.uid()));
CREATE POLICY "dossier files staff update" ON storage.objects FOR UPDATE
  USING (bucket_id='dossiers' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id='dossiers' AND public.is_staff(auth.uid()));
CREATE POLICY "dossier files staff delete" ON storage.objects FOR DELETE
  USING (bucket_id='dossiers' AND public.is_staff(auth.uid()));
