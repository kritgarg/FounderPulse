
-- 1. Program mentors
CREATE TABLE public.program_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL UNIQUE,
  rotation_order INT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.program_mentors TO authenticated, anon;
GRANT ALL ON public.program_mentors TO service_role;
ALTER TABLE public.program_mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentors readable" ON public.program_mentors FOR SELECT USING (true);
CREATE POLICY "mentors admin write" ON public.program_mentors FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.program_mentors (full_name, rotation_order) VALUES
  ('Vivek', 0), ('Udit', 1), ('Nitish', 2);

-- 2. Holidays
CREATE TABLE public.program_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'national'
);
GRANT SELECT ON public.program_holidays TO authenticated, anon;
GRANT ALL ON public.program_holidays TO service_role;
ALTER TABLE public.program_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays readable" ON public.program_holidays FOR SELECT USING (true);
CREATE POLICY "holidays admin write" ON public.program_holidays FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.program_holidays (holiday_date, name, kind) VALUES
  ('2026-08-15','Independence Day','national'),
  ('2026-10-02','Gandhi Jayanti','national'),
  ('2026-10-20','Dussehra (Vijayadashami)','festival'),
  ('2026-11-08','Diwali','festival'),
  ('2026-11-24','Guru Nanak Jayanti','festival');

-- 3. Calendar
CREATE TABLE public.program_calendar_days (
  day DATE PRIMARY KEY,
  is_weekend BOOLEAN NOT NULL,
  is_holiday BOOLEAN NOT NULL DEFAULT false,
  holiday_name TEXT
);
GRANT SELECT ON public.program_calendar_days TO authenticated, anon;
GRANT ALL ON public.program_calendar_days TO service_role;
ALTER TABLE public.program_calendar_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar readable" ON public.program_calendar_days FOR SELECT USING (true);
CREATE POLICY "calendar admin write" ON public.program_calendar_days FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.program_calendar_days (day, is_weekend, is_holiday, holiday_name)
SELECT d::date,
       EXTRACT(ISODOW FROM d) IN (6,7),
       h.holiday_date IS NOT NULL,
       h.name
FROM generate_series('2026-08-01'::date, '2026-12-01'::date, INTERVAL '1 day') d
LEFT JOIN public.program_holidays h ON h.holiday_date = d::date;

-- 4. Biweekly meetings
CREATE TABLE public.biweekly_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_number INT NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_weekday TEXT NOT NULL,
  submit_deadline DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biweekly_meetings TO authenticated, anon;
GRANT ALL ON public.biweekly_meetings TO service_role;
ALTER TABLE public.biweekly_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings readable" ON public.biweekly_meetings FOR SELECT USING (true);
CREATE POLICY "meetings admin write" ON public.biweekly_meetings FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.biweekly_meetings (cycle_number, period_start, period_end, meeting_date, meeting_weekday, submit_deadline) VALUES
  (1,'2026-08-01','2026-08-14','2026-08-13','Thursday','2026-08-14'),
  (2,'2026-08-15','2026-08-28','2026-08-27','Thursday','2026-08-28'),
  (3,'2026-08-29','2026-09-11','2026-09-10','Thursday','2026-09-11'),
  (4,'2026-09-12','2026-09-25','2026-09-24','Thursday','2026-09-25'),
  (5,'2026-09-26','2026-10-09','2026-10-08','Thursday','2026-10-09'),
  (6,'2026-10-10','2026-10-23','2026-10-22','Thursday','2026-10-23'),
  (7,'2026-10-24','2026-11-06','2026-11-05','Thursday','2026-11-06'),
  (8,'2026-11-07','2026-11-20','2026-11-19','Thursday','2026-11-20'),
  (9,'2026-11-21','2026-12-01','2026-11-26','Thursday','2026-12-01');

-- 5. Founder × meeting mentor rotation view
CREATE OR REPLACE VIEW public.founder_meeting_assignments AS
WITH ordered_founders AS (
  SELECT id AS founder_id, startup_name,
         (row_number() OVER (ORDER BY created_at, id) - 1) AS founder_idx
  FROM public.founders
),
mentor_count AS (SELECT count(*)::int AS n FROM public.program_mentors)
SELECT m.id AS meeting_id, m.cycle_number, m.meeting_date, m.submit_deadline,
       f.founder_id, f.startup_name, pm.id AS mentor_id, pm.full_name AS mentor_name
FROM public.biweekly_meetings m
CROSS JOIN ordered_founders f
JOIN mentor_count mc ON true
JOIN public.program_mentors pm
  ON pm.rotation_order = ((f.founder_idx + (m.cycle_number - 1)) % mc.n);
GRANT SELECT ON public.founder_meeting_assignments TO authenticated, anon;

-- 6. Transcripts
CREATE TABLE public.meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.biweekly_meetings(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.program_mentors(id),
  source TEXT NOT NULL CHECK (source IN ('fireflies','manual')),
  fireflies_transcript_id TEXT,
  transcript TEXT NOT NULL,
  meeting_started_at TIMESTAMPTZ,
  duration_minutes INT,
  ingested_by UUID REFERENCES auth.users(id),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, founder_id)
);
CREATE INDEX ON public.meeting_transcripts (founder_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_transcripts TO authenticated;
GRANT ALL ON public.meeting_transcripts TO service_role;
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcripts read" ON public.meeting_transcripts FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "transcripts staff write" ON public.meeting_transcripts FOR ALL
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 7. Mentor KPIs / goals
CREATE TABLE public.mentor_kpi_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.meeting_transcripts(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.biweekly_meetings(id) ON DELETE CASCADE,
  kpis JSONB NOT NULL DEFAULT '[]',
  goals JSONB NOT NULL DEFAULT '[]',
  risks JSONB NOT NULL DEFAULT '[]',
  action_items JSONB NOT NULL DEFAULT '[]',
  mentor_sentiment TEXT,
  next_review_focus TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.mentor_kpi_goals (founder_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_kpi_goals TO authenticated;
GRANT ALL ON public.mentor_kpi_goals TO service_role;
ALTER TABLE public.mentor_kpi_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi read" ON public.mentor_kpi_goals FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "kpi staff write" ON public.mentor_kpi_goals FOR ALL
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_mentor_kpi_goals_updated BEFORE UPDATE ON public.mentor_kpi_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Onboarding questionnaire
CREATE TABLE public.onboarding_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE UNIQUE,
  product JSONB NOT NULL DEFAULT '{}',
  process JSONB NOT NULL DEFAULT '{}',
  customers JSONB NOT NULL DEFAULT '{}',
  revenue JSONB NOT NULL DEFAULT '{}',
  team JSONB NOT NULL DEFAULT '{}',
  traction JSONB NOT NULL DEFAULT '{}',
  market JSONB NOT NULL DEFAULT '{}',
  moat JSONB NOT NULL DEFAULT '{}',
  financials JSONB NOT NULL DEFAULT '{}',
  risks JSONB NOT NULL DEFAULT '{}',
  next_90_days JSONB NOT NULL DEFAULT '{}',
  current_stage TEXT,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_questionnaires TO authenticated;
GRANT ALL ON public.onboarding_questionnaires TO service_role;
ALTER TABLE public.onboarding_questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb read" ON public.onboarding_questionnaires FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "onb owner insert" ON public.onboarding_questionnaires FOR INSERT
  WITH CHECK (public.owns_founder(auth.uid(), founder_id) OR public.is_staff(auth.uid()));
CREATE POLICY "onb owner update" ON public.onboarding_questionnaires FOR UPDATE
  USING ((public.owns_founder(auth.uid(), founder_id) AND submitted_at IS NULL) OR public.is_staff(auth.uid()))
  WITH CHECK ((public.owns_founder(auth.uid(), founder_id) AND submitted_at IS NULL) OR public.is_staff(auth.uid()));
CREATE TRIGGER trg_onboarding_updated BEFORE UPDATE ON public.onboarding_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Onboarding documents
CREATE TABLE public.onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES public.onboarding_questionnaires(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('file','link')),
  url TEXT,
  file_path TEXT,
  mime TEXT,
  size_bytes BIGINT,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.onboarding_documents (founder_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_documents TO authenticated;
GRANT ALL ON public.onboarding_documents TO service_role;
ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onb doc read" ON public.onboarding_documents FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "onb doc write" ON public.onboarding_documents FOR ALL
  USING (public.owns_founder(auth.uid(), founder_id) OR public.is_staff(auth.uid()))
  WITH CHECK (public.owns_founder(auth.uid(), founder_id) OR public.is_staff(auth.uid()));

-- 10. Startup dossiers
CREATE TABLE public.startup_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE UNIQUE,
  sections JSONB NOT NULL DEFAULT '{}',
  markdown TEXT,
  markdown_storage_path TEXT,
  source_summary JSONB,
  model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.startup_dossiers TO authenticated;
GRANT ALL ON public.startup_dossiers TO service_role;
ALTER TABLE public.startup_dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dossier read" ON public.startup_dossiers FOR SELECT
  USING (public.is_staff(auth.uid()) OR public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "dossier staff write" ON public.startup_dossiers FOR ALL
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_dossier_updated BEFORE UPDATE ON public.startup_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
