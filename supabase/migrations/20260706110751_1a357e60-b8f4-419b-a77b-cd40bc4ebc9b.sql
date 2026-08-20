
-- Bi-weekly mentor observations (per cycle)
CREATE TABLE public.biweekly_mentor_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL CHECK (cycle_number BETWEEN 1 AND 13),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observation TEXT NOT NULL,
  strengths TEXT,
  concerns TEXT,
  action_items TEXT,
  evidence_reviewed JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (founder_id, cycle_number, author_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biweekly_mentor_observations TO authenticated;
GRANT ALL ON public.biweekly_mentor_observations TO service_role;

ALTER TABLE public.biweekly_mentor_observations ENABLE ROW LEVEL SECURITY;

-- Founder can read observations about their own startup
CREATE POLICY "obs_founder_read" ON public.biweekly_mentor_observations
  FOR SELECT TO authenticated
  USING (public.owns_founder(auth.uid(), founder_id));

-- Staff can read all
CREATE POLICY "obs_staff_read" ON public.biweekly_mentor_observations
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Mentors and staff can create/edit their own observations
CREATE POLICY "obs_author_write" ON public.biweekly_mentor_observations
  FOR ALL TO authenticated
  USING (
    auth.uid() = author_id AND (
      public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'mentor'::app_role)
    )
  )
  WITH CHECK (
    auth.uid() = author_id AND (
      public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'mentor'::app_role)
    )
  );

CREATE TRIGGER trg_biweekly_mentor_obs_updated
  BEFORE UPDATE ON public.biweekly_mentor_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock rule: once the cycle deadline (period_end + 3 days grace) has passed,
-- or the row is already submitted, students can no longer edit/delete.
-- Staff bypass the lock.
CREATE OR REPLACE FUNCTION public.enforce_biweekly_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline DATE;
  v_is_staff BOOLEAN := public.is_staff(auth.uid());
BEGIN
  IF v_is_staff THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.submitted_at IS NOT NULL THEN
      RAISE EXCEPTION 'This cycle has been submitted and is locked.';
    END IF;
    IF OLD.period_end + INTERVAL '3 days' < now() THEN
      RAISE EXCEPTION 'The deadline for cycle % has passed. Contact faculty to reopen.', OLD.cycle_number;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- If it was already submitted, only allow the transition back to draft when staff does it (handled above)
    IF OLD.submitted_at IS NOT NULL THEN
      RAISE EXCEPTION 'This cycle has been submitted and is locked. Contact faculty to reopen.';
    END IF;
    v_deadline := OLD.period_end + INTERVAL '3 days';
    IF v_deadline < CURRENT_DATE THEN
      RAISE EXCEPTION 'The deadline for cycle % has passed on %. Contact faculty to reopen.', OLD.cycle_number, v_deadline;
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT
  IF NEW.period_end + INTERVAL '3 days' < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot create a submission for a cycle whose deadline (%) has passed.', NEW.period_end + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_biweekly_lock ON public.biweekly_submissions;
CREATE TRIGGER trg_enforce_biweekly_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.biweekly_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_biweekly_lock();
