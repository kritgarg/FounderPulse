
-- Enums
CREATE TYPE public.app_role AS ENUM ('super_admin', 'faculty', 'mentor', 'student');
CREATE TYPE public.startup_stage AS ENUM ('idea', 'validation', 'mvp', 'pilot', 'revenue', 'scale');
CREATE TYPE public.review_status AS ENUM ('green', 'yellow', 'red');
CREATE TYPE public.recommendation AS ENUM ('continue', 'continue_monitoring', 'probation', 'return_to_academic');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  campus TEXT,
  batch TEXT,
  semester TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','faculty'))
$$;

-- profile policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Staff read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Staff manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- user_roles policies
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Staff read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- founders
CREATE TABLE public.founders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  founder_name TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  campus TEXT,
  batch TEXT,
  semester TEXT,
  industry TEXT,
  team_size INT DEFAULT 1,
  stage public.startup_stage NOT NULL DEFAULT 'idea',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founders TO authenticated;
GRANT ALL ON public.founders TO service_role;
ALTER TABLE public.founders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage founders" ON public.founders FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Founder reads own" ON public.founders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Founder updates own" ON public.founders FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- mentor_assignments
CREATE TABLE public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, founder_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_assignments TO service_role;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage assignments" ON public.mentor_assignments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Mentor reads own assignments" ON public.mentor_assignments FOR SELECT TO authenticated USING (mentor_id = auth.uid());

-- Mentors can read founders they're assigned to
CREATE POLICY "Mentor reads assigned founders" ON public.founders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mentor_assignments ma WHERE ma.founder_id = founders.id AND ma.mentor_id = auth.uid()));

-- monthly_submissions
CREATE TABLE public.monthly_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  month_number INT NOT NULL,
  year INT NOT NULL,
  interviews_conducted INT DEFAULT 0,
  key_learnings TEXT,
  assumptions_invalidated TEXT,
  features_built TEXT,
  iterations_completed INT DEFAULT 0,
  demo_link TEXT,
  total_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  pilots INT DEFAULT 0,
  partnerships INT DEFAULT 0,
  biggest_learning TEXT,
  biggest_failure TEXT,
  what_changed TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(founder_id, month_number, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_submissions TO authenticated;
GRANT ALL ON public.monthly_submissions TO service_role;
ALTER TABLE public.monthly_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage submissions" ON public.monthly_submissions FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Founder manages own submissions" ON public.monthly_submissions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.founders f WHERE f.id = founder_id AND f.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.founders f WHERE f.id = founder_id AND f.user_id = auth.uid()));
CREATE POLICY "Mentor reads assigned submissions" ON public.monthly_submissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mentor_assignments ma WHERE ma.founder_id = monthly_submissions.founder_id AND ma.mentor_id = auth.uid()));

-- evaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.monthly_submissions(id) ON DELETE SET NULL,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  month_number INT NOT NULL,
  year INT NOT NULL,
  execution_score INT NOT NULL DEFAULT 0,
  customer_score INT NOT NULL DEFAULT 0,
  business_score INT NOT NULL DEFAULT 0,
  behavior_score INT NOT NULL DEFAULT 0,
  total_score INT GENERATED ALWAYS AS (execution_score + customer_score + business_score + behavior_score) STORED,
  status public.review_status,
  execution_comment TEXT,
  customer_comment TEXT,
  business_comment TEXT,
  behavior_comment TEXT,
  overall_comment TEXT,
  recommendation public.recommendation,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage evaluations" ON public.evaluations FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Founder reads own evaluations" ON public.evaluations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.founders f WHERE f.id = founder_id AND f.user_id = auth.uid()));
CREATE POLICY "Mentor reads assigned evaluations" ON public.evaluations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mentor_assignments ma WHERE ma.founder_id = evaluations.founder_id AND ma.mentor_id = auth.uid()));

-- Auto-set status from total_score
CREATE OR REPLACE FUNCTION public.set_eval_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total INT;
BEGIN
  total := COALESCE(NEW.execution_score,0)+COALESCE(NEW.customer_score,0)+COALESCE(NEW.business_score,0)+COALESCE(NEW.behavior_score,0);
  IF NEW.status IS NULL OR NOT NEW.manual_override THEN
    NEW.status := CASE WHEN total >= 70 THEN 'green'::review_status WHEN total >= 50 THEN 'yellow'::review_status ELSE 'red'::review_status END;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_eval_status BEFORE INSERT OR UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.set_eval_status();

-- mentor_observations
CREATE TABLE public.mentor_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_observations TO authenticated;
GRANT ALL ON public.mentor_observations TO service_role;
ALTER TABLE public.mentor_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor manage own observations" ON public.mentor_observations FOR ALL TO authenticated USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());
CREATE POLICY "Staff read observations" ON public.mentor_observations FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Founder reads own observations" ON public.mentor_observations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.founders f WHERE f.id = founder_id AND f.user_id = auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  -- Default role: student. Admins can promote later.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
