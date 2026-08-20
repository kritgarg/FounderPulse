
-- ============ Student allowlist ============
CREATE TABLE public.student_allowlist (
  email text PRIMARY KEY,
  student_name text NOT NULL,
  founder_id uuid REFERENCES public.founders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.student_allowlist TO authenticated;
GRANT ALL ON public.student_allowlist TO service_role;
ALTER TABLE public.student_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages allowlist" ON public.student_allowlist
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Staff view allowlist" ON public.student_allowlist
  FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "Self can view own allowlist row" ON public.student_allowlist
  FOR SELECT USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

-- Seed (lowercased emails)
INSERT INTO public.student_allowlist (email, student_name, founder_id) VALUES
  ('gayatri.jaiswal@adypu.edu.in','Gayatri Jaiswal','2ab95a9c-f29c-41bc-b0e3-702f7c9fcda3'),
  ('ashu.choudhary@adypu.edu.in','Ashu Choudhary','c212eb9c-0fcf-4692-8a1b-42d3b81b4687'),
  ('harshit.jain@adypu.edu.in','Harshit Jain','712c3d65-0d78-483c-83de-a476d5d9922b'),
  ('pathan.amaan@adypu.edu.in','Pathan Amaan','50ca98ba-f7f7-4c5b-ab26-54e9c4b5d954'),
  ('manish.balayan@adypu.edu.in','MANISH BALAYAN','f2b525d5-217c-4544-96d0-20fc5f937219'),
  ('vansh.k@adypu.edu.in','Vansh Dagar','72f2fd9b-384e-4207-8db3-4ba0bfd04101'),
  ('bhavya.jain@adypu.edu.in','Bhavya Jain','1c018a4b-c208-4cc0-94c5-3230c4af0196'),
  ('atharv.paharia@adypu.edu.in','Atharv Paharia','ec3a8b6d-4a6b-4a80-afb9-d7c9adda964c'),
  ('arkapravo.rajkonwar@adypu.edu.in','Arkapravo Rajkonwar','253406a2-bd19-4fc7-a37a-ce8df3cb75cd'),
  ('soham.saranga@adypu.edu.in','Soham Saranga','6eaba5cb-c088-44ca-b13d-8a68b198f5c8'),
  ('chiranjeev.agarwal@adypu.edu.in','Chiranjeev Agarwal','e92a3ad0-7f0b-47f3-82ca-c3bdeed99d2d'),
  ('sahil.khan@adypu.edu.in','SAHIL KHAN','ce31e5d5-c390-4695-b221-6f71bc1dab11'),
  ('daksh.saini@adypu.edu.in','Daksh Saini','a9c20049-ac8a-4c6d-a450-034034197256'),
  ('pranay.chitare@adypu.edu.in','Pranay Sanjay Chitare','9632b046-b1c9-4530-9335-8368ecda0133'),
  ('tanubhav.katiyar@adypu.edu.in','Tanubhav Katiyar','4205db65-c6ab-4821-8107-6b789ed605bc'),
  ('aniruddh.sharma@adypu.edu.in','Aniruddh Sharma','8f720a0b-bec8-49be-bb62-ce755c7b40d6'),
  ('suraj.kulkarni@adypu.edu.in','Suraj Kulkarni','75b85a4e-c6ad-4695-92ae-9a127e60c2cf');

-- ============ Faculty signup requests ============
CREATE TABLE public.faculty_signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  notes text
);
GRANT SELECT, UPDATE ON public.faculty_signup_requests TO authenticated;
GRANT ALL ON public.faculty_signup_requests TO service_role;
ALTER TABLE public.faculty_signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages faculty requests" ON public.faculty_signup_requests
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "User views own request" ON public.faculty_signup_requests
  FOR SELECT USING (user_id = auth.uid());

-- ============ New-user trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_email text := lower(NEW.email);
  v_requested_role text := lower(coalesce(NEW.raw_user_meta_data->>'requested_role',''));
  v_full_name text := coalesce(NEW.raw_user_meta_data->>'full_name','');
  v_allow record;
BEGIN
  IF v_requested_role NOT IN ('student','faculty') THEN
    RAISE EXCEPTION 'Please choose Student or Faculty when creating your account.';
  END IF;

  IF v_requested_role = 'student' THEN
    SELECT * INTO v_allow FROM public.student_allowlist WHERE lower(email) = v_email;
    IF v_allow IS NULL THEN
      RAISE EXCEPTION 'This email is not on the approved student list. Contact the program lead.';
    END IF;

    INSERT INTO public.profiles (id, full_name, email, founder_id)
    VALUES (NEW.id, coalesce(nullif(v_full_name,''), v_allow.student_name), NEW.email, v_allow.founder_id)
    ON CONFLICT (id) DO UPDATE SET founder_id = EXCLUDED.founder_id;

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;

  ELSE -- faculty
    IF v_email !~ '@newtonschool\.co$' THEN
      RAISE EXCEPTION 'Faculty sign-up requires a @newtonschool.co email.';
    END IF;

    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, v_full_name, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    IF v_email = 'nitish.venkatraman@newtonschool.co' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT DO NOTHING;
    ELSE
      -- No role granted until super admin approves
      INSERT INTO public.faculty_signup_requests (user_id, email, full_name)
      VALUES (NEW.id, NEW.email, v_full_name);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
