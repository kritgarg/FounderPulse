
-- Autonomous agents registry and run log
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'manual',
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_configs TO authenticated;
GRANT ALL ON public.agent_configs TO service_role;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read agent_configs" ON public.agent_configs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_slug TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  items_processed INT NOT NULL DEFAULT 0,
  summary TEXT,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT
);
GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read agent_runs" ON public.agent_runs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_agent_runs_slug_started ON public.agent_runs (agent_slug, started_at DESC);

CREATE TRIGGER trg_agent_configs_updated_at BEFORE UPDATE ON public.agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.agent_configs (slug, name, description, cadence, channels) VALUES
  ('onboarding_nudger', 'Onboarding Nudger', 'Emails founders with missing intake evidence every 48h until submitted.', '0 9 */2 * *', ARRAY['resend']),
  ('cycle_scheduler', 'Cycle Scheduler', 'Auto-creates upcoming bi-weekly submission windows and Google Calendar events for mentor pairs.', '0 6 * * 1', ARRAY['google_calendar']),
  ('transcript_router', 'Transcript Router', 'Alerts assigned mentor on Slack when a transcript is ingested and awaiting verification.', 'event', ARRAY['slack']),
  ('dossier_recompiler', 'Dossier Auto-Recompiler', 'Recompiles the startup dossier whenever a new questionnaire or transcript lands, appending a new version.', '*/30 * * * *', ARRAY['notion']),
  ('risk_sentinel', 'Risk Sentinel', 'AI scans new transcripts for red-flag risks and posts to Slack + opens academic alerts.', '0 * * * *', ARRAY['slack','lovable_ai']),
  ('weekly_digest', 'Weekly Leadership Digest', 'Emails leadership every Monday with cohort health, alerts, and upcoming reviews.', '0 8 * * 1', ARRAY['resend'])
ON CONFLICT (slug) DO NOTHING;
