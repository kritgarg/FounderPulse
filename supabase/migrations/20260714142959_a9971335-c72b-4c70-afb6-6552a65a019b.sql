
-- 1) Dossier version history (append-only per recompile)
CREATE TABLE public.startup_dossier_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  version integer NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  markdown text,
  markdown_storage_path text,
  source_summary jsonb,
  model text,
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (founder_id, version)
);
CREATE INDEX startup_dossier_versions_founder_idx ON public.startup_dossier_versions(founder_id, version DESC);

GRANT SELECT, INSERT, UPDATE ON public.startup_dossier_versions TO authenticated;
GRANT ALL ON public.startup_dossier_versions TO service_role;
ALTER TABLE public.startup_dossier_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dossier versions read" ON public.startup_dossier_versions
  FOR SELECT USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "dossier versions staff write" ON public.startup_dossier_versions
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- 2) Mentor KPI/goals edit audit trail
CREATE TABLE public.mentor_kpi_edit_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_goal_id uuid NOT NULL REFERENCES public.mentor_kpi_goals(id) ON DELETE CASCADE,
  transcript_id uuid REFERENCES public.meeting_transcripts(id) ON DELETE SET NULL,
  founder_id uuid NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES auth.users(id),
  field text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mentor_kpi_edit_audit_kpi_idx ON public.mentor_kpi_edit_audit(kpi_goal_id, created_at DESC);
CREATE INDEX mentor_kpi_edit_audit_founder_idx ON public.mentor_kpi_edit_audit(founder_id, created_at DESC);

GRANT SELECT, INSERT ON public.mentor_kpi_edit_audit TO authenticated;
GRANT ALL ON public.mentor_kpi_edit_audit TO service_role;
ALTER TABLE public.mentor_kpi_edit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi audit read" ON public.mentor_kpi_edit_audit
  FOR SELECT USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "kpi audit staff insert" ON public.mentor_kpi_edit_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
