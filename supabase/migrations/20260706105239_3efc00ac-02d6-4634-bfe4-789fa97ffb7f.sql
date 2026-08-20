
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

ALTER TABLE public.founders ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.founder_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL UNIQUE REFERENCES public.founders(id) ON DELETE CASCADE,
  one_liner text,
  problem_statement text,
  target_customer text,
  current_stage public.lifecycle_stage,
  business_model text,
  traction_summary text,
  key_assumptions text,
  top_risks text,
  six_month_goals text,
  capital_status text,
  weekly_hours_committed int,
  cofounders text,
  tech_stack text,
  website_url text,
  demo_url text,
  deck_url text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_intakes TO authenticated;
GRANT ALL ON public.founder_intakes TO service_role;
ALTER TABLE public.founder_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_owner_all" ON public.founder_intakes FOR ALL TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id))
  WITH CHECK (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "intake_staff_read" ON public.founder_intakes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "intake_staff_write" ON public.founder_intakes FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_founder_intakes_updated ON public.founder_intakes;
CREATE TRIGGER trg_founder_intakes_updated
  BEFORE UPDATE ON public.founder_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_founder_on_intake()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL THEN
    UPDATE public.founders
      SET intake_completed_at = NEW.submitted_at,
          lifecycle_stage = COALESCE(NEW.current_stage, lifecycle_stage)
      WHERE id = NEW.founder_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_founder_on_intake ON public.founder_intakes;
CREATE TRIGGER trg_sync_founder_on_intake
  AFTER INSERT OR UPDATE ON public.founder_intakes
  FOR EACH ROW EXECUTE FUNCTION public.sync_founder_on_intake();

CREATE TABLE IF NOT EXISTS public.biweekly_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  progress_summary text,
  wins text,
  blockers text,
  hours_worked int DEFAULT 0,
  customer_interviews int DEFAULT 0,
  features_shipped int DEFAULT 0,
  revenue numeric DEFAULT 0,
  users_acquired int DEFAULT 0,
  experiments_run int DEFAULT 0,
  mentor_meeting_date date,
  mentor_meeting_notes text,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals_next_cycle text,
  ask_for_help text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (founder_id, cycle_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biweekly_submissions TO authenticated;
GRANT ALL ON public.biweekly_submissions TO service_role;
ALTER TABLE public.biweekly_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biweekly_owner_all" ON public.biweekly_submissions FOR ALL TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id))
  WITH CHECK (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "biweekly_staff_read" ON public.biweekly_submissions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "biweekly_staff_write" ON public.biweekly_submissions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS trg_biweekly_submissions_updated ON public.biweekly_submissions;
CREATE TRIGGER trg_biweekly_submissions_updated
  BEFORE UPDATE ON public.biweekly_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_biweekly_founder ON public.biweekly_submissions(founder_id, cycle_number);
