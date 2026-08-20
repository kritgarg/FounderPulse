
DO $$ BEGIN CREATE TYPE public.lifecycle_stage AS ENUM ('idea','discovery','validation','mvp','pilot','revenue','growth','fundraising'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lifecycle_status AS ENUM ('active','paused','pivoted','merged','acquired','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.evidence_category AS ENUM ('customer','product','business','behavior'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.evidence_kind AS ENUM ('file','link'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.review_decision AS ENUM ('approve','reject','edit','resubmit','pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.committee_level AS ENUM ('founder_self','ai','faculty','mentor','board'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.event_role AS ENUM ('attendee','presenter','winner','volunteer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'leadership';

ALTER TABLE public.founders
  ADD COLUMN IF NOT EXISTS lifecycle_stage public.lifecycle_stage NOT NULL DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS lifecycle_status public.lifecycle_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS mentor_id UUID,
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founder_id UUID REFERENCES public.founders(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.owns_founder(_user_id UUID, _founder_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND founder_id = _founder_id)
$$;
GRANT EXECUTE ON FUNCTION public.owns_founder(uuid, uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Owner views own founder" ON public.founders;
CREATE POLICY "Owner views own founder" ON public.founders FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), id));
DROP POLICY IF EXISTS "Owner updates own founder stage" ON public.founders;
CREATE POLICY "Owner updates own founder stage" ON public.founders FOR UPDATE TO authenticated
  USING (public.owns_founder(auth.uid(), id)) WITH CHECK (public.owns_founder(auth.uid(), id));

CREATE TABLE IF NOT EXISTS public.weekly_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  hours_worked INT DEFAULT 0, meetings INT DEFAULT 0, customers_spoken INT DEFAULT 0,
  features_shipped INT DEFAULT 0, revenue NUMERIC DEFAULT 0, users_acquired INT DEFAULT 0,
  experiments INT DEFAULT 0, failures TEXT, learning TEXT, roadblocks TEXT, support_needed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(founder_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_trackers TO authenticated;
GRANT ALL ON public.weekly_trackers TO service_role;
ALTER TABLE public.weekly_trackers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own weekly" ON public.weekly_trackers FOR ALL TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id)) WITH CHECK (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Staff view weekly" ON public.weekly_trackers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.submission_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 6),
  summary TEXT, what_worked TEXT, what_failed TEXT, what_changed TEXT,
  assumptions_invalidated TEXT, next_steps TEXT,
  submitted_at TIMESTAMPTZ, locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(founder_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submission_packets TO authenticated;
GRANT ALL ON public.submission_packets TO service_role;
ALTER TABLE public.submission_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own packets" ON public.submission_packets FOR ALL TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id) AND locked = false)
  WITH CHECK (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Owner views own packets" ON public.submission_packets FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Staff view packets" ON public.submission_packets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manages packets" ON public.submission_packets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  category public.evidence_category NOT NULL, kind public.evidence_kind NOT NULL,
  title TEXT NOT NULL, url TEXT, file_path TEXT, mime TEXT, size BIGINT,
  month INT CHECK (month BETWEEN 1 AND 6), week_start DATE, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own evidence" ON public.evidence_items FOR ALL TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id)) WITH CHECK (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Staff view evidence" ON public.evidence_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID NOT NULL REFERENCES public.submission_packets(id) ON DELETE CASCADE,
  strengths TEXT, weaknesses TEXT, risks TEXT, missing TEXT,
  suggested_execution INT, suggested_customer INT, suggested_business INT, suggested_behavior INT,
  suggested_total INT, suggested_status review_status, faculty_summary TEXT, raw_json JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_evaluations TO authenticated;
GRANT ALL ON public.ai_evaluations TO service_role;
ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view ai_eval" ON public.ai_evaluations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manages ai_eval" ON public.ai_evaluations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.faculty_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID NOT NULL REFERENCES public.submission_packets(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  reviewer_id UUID,
  execution_score INT DEFAULT 0, customer_score INT DEFAULT 0,
  business_score INT DEFAULT 0, behavior_score INT DEFAULT 0, total_score INT DEFAULT 0,
  status review_status, decision public.review_decision NOT NULL DEFAULT 'pending',
  comments TEXT, decided_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_reviews TO authenticated;
GRANT ALL ON public.faculty_reviews TO service_role;
ALTER TABLE public.faculty_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage faculty_reviews" ON public.faculty_reviews FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Owner views approved reviews" ON public.faculty_reviews FOR SELECT TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id) AND decision = 'approve');

CREATE TABLE IF NOT EXISTS public.committee_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  level public.committee_level NOT NULL, reviewer_name TEXT, organisation TEXT,
  score INT, notes TEXT, month INT CHECK (month BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_scores TO authenticated;
GRANT ALL ON public.committee_scores TO service_role;
ALTER TABLE public.committee_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view committee" ON public.committee_scores FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manages committee" ON public.committee_scores FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Owner views own committee" ON public.committee_scores FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), founder_id));

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, date DATE, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages events" ON public.events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.event_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  role public.event_role NOT NULL DEFAULT 'attendee', evidence_url TEXT,
  faculty_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participations TO authenticated;
GRANT ALL ON public.event_participations TO service_role;
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own event part" ON public.event_participations FOR ALL TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id)) WITH CHECK (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Staff view event part" ON public.event_participations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manages event part" ON public.event_participations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, domain TEXT, email TEXT, organisation TEXT,
  availability TEXT, rating NUMERIC, meetings_count INT DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentors TO authenticated;
GRANT ALL ON public.mentors TO service_role;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view mentors" ON public.mentors FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owner views assigned mentor" ON public.mentors FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.founders f JOIN public.profiles p ON p.founder_id=f.id WHERE p.id=auth.uid() AND f.mentor_id = mentors.id));
CREATE POLICY "Admin manages mentors" ON public.mentors FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  name TEXT NOT NULL, score NUMERIC, rank INT, status TEXT,
  faculty_comments TEXT, evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulations TO authenticated;
GRANT ALL ON public.simulations TO service_role;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view sims" ON public.simulations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owner views own sims" ON public.simulations FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Admin manages sims" ON public.simulations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 6),
  interviews INT DEFAULT 0, features_shipped INT DEFAULT 0, mvp_velocity NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0, partnerships INT DEFAULT 0, experiments INT DEFAULT 0,
  consistency_score NUMERIC DEFAULT 0, mentor_engagement NUMERIC DEFAULT 0,
  evidence_completeness NUMERIC DEFAULT 0, timeliness NUMERIC DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(founder_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_snapshots TO authenticated;
GRANT ALL ON public.kpi_snapshots TO service_role;
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view kpi" ON public.kpi_snapshots FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owner views own kpi" ON public.kpi_snapshots FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), founder_id));

CREATE TABLE IF NOT EXISTS public.academic_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (subject IN ('subject_1','subject_2')),
  semester TEXT, monthly_scores JSONB DEFAULT '{}'::jsonb,
  semester_score NUMERIC, final_score NUMERIC, passed BOOLEAN, board_status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(founder_id, subject)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_credits TO authenticated;
GRANT ALL ON public.academic_credits TO service_role;
ALTER TABLE public.academic_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view credits" ON public.academic_credits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owner views own credits" ON public.academic_credits FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Admin manages credits" ON public.academic_credits FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.academic_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_alerts TO authenticated;
GRANT ALL ON public.academic_alerts TO service_role;
ALTER TABLE public.academic_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view alerts" ON public.academic_alerts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admin manages alerts" ON public.academic_alerts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.check_consecutive_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
DECLARE last_two TEXT[];
BEGIN
  IF NEW.decision <> 'approve' THEN RETURN NEW; END IF;
  SELECT array_agg(status::text ORDER BY decided_at DESC) INTO last_two
    FROM (
      SELECT status, decided_at FROM public.faculty_reviews
      WHERE founder_id = NEW.founder_id AND decision='approve' AND status IS NOT NULL
      ORDER BY decided_at DESC LIMIT 2
    ) q;
  IF last_two IS NOT NULL AND array_length(last_two,1) = 2 THEN
    IF last_two[1]='yellow' AND last_two[2]='yellow' THEN
      INSERT INTO public.academic_alerts(founder_id, kind, reason)
        VALUES (NEW.founder_id,'faculty_review','Two consecutive yellow reviews');
    ELSIF last_two[1]='red' AND last_two[2]='red' THEN
      INSERT INTO public.academic_alerts(founder_id, kind, reason)
        VALUES (NEW.founder_id,'board_review','Two consecutive red reviews — academic review board required');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_faculty_alerts ON public.faculty_reviews;
CREATE TRIGGER trg_faculty_alerts AFTER INSERT OR UPDATE ON public.faculty_reviews
  FOR EACH ROW EXECUTE FUNCTION public.check_consecutive_alerts();

CREATE TABLE IF NOT EXISTS public.career_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE UNIQUE,
  primary_path TEXT, alt_paths JSONB DEFAULT '[]'::jsonb,
  rationale TEXT, generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_recommendations TO authenticated;
GRANT ALL ON public.career_recommendations TO service_role;
ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view career" ON public.career_recommendations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owner views own career" ON public.career_recommendations FOR SELECT TO authenticated USING (public.owns_founder(auth.uid(), founder_id));
CREATE POLICY "Admin manages career" ON public.career_recommendations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
