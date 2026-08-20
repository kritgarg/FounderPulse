
-- Fix: grant EXECUTE on security-definer helper functions so RLS policies can call them
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Add an approved flag for the baseline review workflow
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS verified_by UUID;

-- Audit log for import / bulk operations
CREATE TABLE IF NOT EXISTS public.import_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  performed_by UUID,
  performed_by_email TEXT,
  record_type TEXT NOT NULL,
  record_ids UUID[] NOT NULL DEFAULT '{}',
  record_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.import_audit_log TO authenticated;
GRANT ALL ON public.import_audit_log TO service_role;

ALTER TABLE public.import_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view audit log" ON public.import_audit_log
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin insert audit log" ON public.import_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Backfill: record the prior 17-founder baseline import
INSERT INTO public.import_audit_log (action, performed_by_email, record_type, record_ids, record_count, notes)
SELECT
  'baseline_import',
  'nitish.venkatraman@newtonschool.co',
  'founders',
  ARRAY(SELECT id FROM public.founders WHERE batch = 'Entrepreneurship Track' ORDER BY created_at),
  (SELECT COUNT(*) FROM public.founders WHERE batch = 'Entrepreneurship Track'),
  'Initial baseline import from Entreprenuer_Final_List_2.xlsx — 17 founder records (no evaluations, KPIs, or mentor assignments).'
WHERE NOT EXISTS (SELECT 1 FROM public.import_audit_log WHERE action = 'baseline_import');
