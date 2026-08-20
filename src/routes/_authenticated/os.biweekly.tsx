import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock, Lock, CheckCircle2, Trash2, Plus, ClipboardList,
  AlertTriangle, TrendingUp, MessageSquare, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/biweekly")({
  component: Biweekly,
});

const CYCLES = 13; // 26 weeks = 13 bi-weekly cycles
const GRACE_DAYS = 3;

type Row = any;

/* ---------- Evidence checklist per cycle (stage-aware) ---------- */
type CheckItem = { key: string; label: string; hint?: string };
const CHECKLISTS: Record<number, { stage: string; items: CheckItem[] }> = {
  1: { stage: "Discovery — Kickoff", items: [
    { key: "problem_doc", label: "Problem statement (1-pager)", hint: "Who hurts, how much, why now." },
    { key: "interviews_3", label: "3 customer discovery interviews (recording or transcript)" },
    { key: "assumptions_map", label: "Riskiest assumptions map" },
    { key: "goals_2w", label: "2-week goals doc" },
  ]},
  2: { stage: "Discovery — Expand", items: [
    { key: "interviews_5", label: "5 more customer interviews" },
    { key: "jtbd", label: "Jobs-to-be-Done statements (3 personas)" },
    { key: "competitor_map", label: "Competitor / alternatives map" },
    { key: "insight_note", label: "Discovery insight note (what changed)" },
  ]},
  3: { stage: "Validation — Signal", items: [
    { key: "landing_page", label: "Landing page live URL" },
    { key: "waitlist_signups", label: "Waitlist signups screenshot (≥25)" },
    { key: "survey_results", label: "Survey results (n ≥ 20)" },
    { key: "pricing_hyp", label: "Pricing hypothesis doc" },
  ]},
  4: { stage: "Validation — Commit", items: [
    { key: "loi_or_prepay", label: "Letter of intent or pre-payment (≥1)" },
    { key: "wizard_test", label: "Wizard-of-Oz / concierge test log" },
    { key: "value_prop_v2", label: "Value prop v2 (revised)" },
    { key: "assumption_kill", label: "Assumptions killed / kept summary" },
  ]},
  5: { stage: "MVP — Build v1", items: [
    { key: "mvp_demo", label: "MVP demo video (≤3 min)" },
    { key: "tech_doc", label: "Architecture / build doc" },
    { key: "user_test_3", label: "3 user testing recordings" },
    { key: "bug_log", label: "Bug / iteration log" },
  ]},
  6: { stage: "MVP — Iterate", items: [
    { key: "mvp_v2_demo", label: "MVP v2 demo (post-iteration)" },
    { key: "usability_report", label: "Usability findings report" },
    { key: "activation_metric", label: "Activation metric definition + first read" },
    { key: "roadmap_next", label: "Roadmap for next cycle" },
  ]},
  7: { stage: "Pilot — Launch", items: [
    { key: "pilot_users", label: "Pilot user list (≥5 with contact)" },
    { key: "onboarding_flow", label: "Onboarding flow doc" },
    { key: "feedback_log", label: "Structured pilot feedback log" },
    { key: "nps_or_csat", label: "NPS / CSAT first read" },
  ]},
  8: { stage: "Pilot — Retain", items: [
    { key: "retention_chart", label: "W1/W2 retention chart" },
    { key: "case_study", label: "1 written case study" },
    { key: "pricing_test", label: "Pricing test results" },
    { key: "churn_reasons", label: "Churn interviews (≥3)" },
  ]},
  9: { stage: "Traction — Revenue", items: [
    { key: "revenue_proof", label: "Revenue proof (invoices / stripe)" },
    { key: "cac_ltv", label: "CAC / LTV first estimate" },
    { key: "growth_chart", label: "Weekly growth chart (last 8 weeks)" },
    { key: "channel_test", label: "Channel test summary" },
  ]},
  10: { stage: "Traction — Scale readiness", items: [
    { key: "unit_econ", label: "Unit economics model" },
    { key: "hiring_plan", label: "Hiring / capacity plan" },
    { key: "ops_playbook", label: "Ops playbook v1" },
    { key: "risk_register", label: "Risk register" },
  ]},
  11: { stage: "Final — Story", items: [
    { key: "pitch_deck", label: "Investor / defense deck v1" },
    { key: "financial_model", label: "12-month financial model" },
    { key: "team_bios", label: "Team & advisors doc" },
    { key: "traction_1pager", label: "Traction 1-pager" },
  ]},
  12: { stage: "Final — Rehearsal", items: [
    { key: "pitch_v2", label: "Deck v2 (post-mentor review)" },
    { key: "dry_run_video", label: "Dry-run pitch video" },
    { key: "qa_prep", label: "Q&A prep doc (20 questions)" },
    { key: "next_6mo_plan", label: "Next 6-month plan" },
  ]},
  13: { stage: "Final — Defense", items: [
    { key: "final_deck", label: "Final defense deck (locked)" },
    { key: "demo_final", label: "Final demo recording" },
    { key: "outcomes_doc", label: "Outcomes summary (what shipped, what next)" },
    { key: "career_reco_form", label: "Career recommendation intake filled" },
  ]},
};

function computeCycles(startISO: string) {
  const start = new Date(startISO);
  return Array.from({ length: CYCLES }, (_, i) => {
    const s = new Date(start); s.setDate(start.getDate() + i * 14);
    const e = new Date(s); e.setDate(s.getDate() + 13);
    const deadline = new Date(e); deadline.setDate(deadline.getDate() + GRACE_DAYS);
    return { n: i + 1, start: s, end: e, deadline };
  });
}

function Biweekly() {
  const { founderId, isStaff, isMentor, user, loading } = useAuth();
  const [founder, setFounder] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);

  const load = async () => {
    if (!founderId) return;
    const [{ data: f }, { data: r }, { data: ev }, { data: obs }] = await Promise.all([
      supabase.from("founders").select("id, startup_name, intake_completed_at, created_at, lifecycle_stage, lifecycle_status").eq("id", founderId).maybeSingle(),
      supabase.from("biweekly_submissions").select("*").eq("founder_id", founderId).order("cycle_number"),
      supabase.from("evaluations").select("id, month_number, year, total_score, status, execution_score, customer_score, business_score, behavior_score, created_at").eq("founder_id", founderId).order("created_at", { ascending: false }).limit(6),
      (supabase.from as any)("biweekly_mentor_observations").select("*").eq("founder_id", founderId).order("cycle_number"),
    ]);
    setFounder(f); setRows(r ?? []); setEvaluations(ev ?? []); setObservations(obs ?? []);
    setReady(true);
  };
  useEffect(() => { load(); }, [founderId]);

  const cycles = useMemo(() => {
    if (!founder) return [];
    const anchor = founder.intake_completed_at ?? founder.created_at ?? new Date().toISOString();
    return computeCycles(anchor);
  }, [founder]);

  const currentCycle = useMemo(() => {
    const now = new Date();
    const c = cycles.find((c) => now >= c.start && now <= c.end);
    return c?.n ?? cycles.find((c) => now < c.start)?.n ?? CYCLES;
  }, [cycles]);

  if (loading || !ready) return <div className="text-muted-foreground">Loading…</div>;
  if (!founderId && !isStaff) return <Navigate to="/os" replace />;
  if (!founderId) return <div className="text-muted-foreground">Bi-weekly portal is for founders.</div>;

  if (!founder?.intake_completed_at) {
    return (
      <Card className="border-amber-300/60 bg-amber-50/40 shadow-none">
        <CardContent className="pt-6 pb-6 space-y-3 text-center">
          <div className="font-display text-lg">Complete Day-1 intake first</div>
          <p className="text-sm text-muted-foreground">
            We need your baseline (stage, assumptions, goals) before we can score bi-weekly progress.
          </p>
          <Link to="/os/onboarding">
            <Button size="sm">Go to intake</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const active = selected ?? currentCycle;
  const activeMeta = cycles.find((c) => c.n === active)!;
  const activeRow = rows.find((r) => r.cycle_number === active);
  const submittedCount = rows.filter((r) => r.submitted_at).length;
  const missedCount = cycles.filter((c) => c.deadline < new Date() && !rows.find((r) => r.cycle_number === c.n && r.submitted_at)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <CalendarClock className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Bi-weekly portal</div>
          <div className="font-display text-2xl tracking-tight">{founder.startup_name}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Current cycle</div>
          <div className="font-display text-lg text-foreground">#{currentCycle}</div>
        </div>
      </div>

      {/* My Progress panel */}
      <MyProgress
        founder={founder}
        submittedCount={submittedCount}
        missedCount={missedCount}
        totalCycles={CYCLES}
        currentCycle={currentCycle}
        evaluations={evaluations}
      />

      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-13 gap-2">
        {cycles.map((c) => {
          const row = rows.find((r) => r.cycle_number === c.n);
          const submitted = !!row?.submitted_at;
          const draft = !!row && !submitted;
          const isCurrent = c.n === currentCycle;
          const isActive = c.n === active;
          const now = new Date();
          const upcoming = now < c.start;
          const pastDeadline = c.deadline < now;
          const missed = pastDeadline && !submitted;
          return (
            <button
              key={c.n}
              onClick={() => setSelected(c.n)}
              className={`relative rounded-md border px-2 py-2.5 text-left text-xs transition-colors ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : submitted
                    ? "border-emerald-300/70 bg-emerald-50/60 hover:bg-emerald-100/60"
                    : missed
                      ? "border-rose-300/70 bg-rose-50/60 hover:bg-rose-100/60"
                      : draft
                        ? "border-amber-300/70 bg-amber-50/60 hover:bg-amber-100/60"
                        : upcoming
                          ? "border-border/60 opacity-60 hover:opacity-90"
                          : "border-border/70 hover:bg-muted/60"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-70 flex items-center gap-1">
                Cycle {c.n}
                {isCurrent && !isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </div>
              <div className="font-mono text-[11px] mt-0.5">
                {c.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {" – "}
                {c.end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
              <div className="mt-1 text-[10px] flex items-center gap-1 opacity-80">
                {submitted ? <><CheckCircle2 className="h-3 w-3" /> Submitted</>
                  : missed ? <><Lock className="h-3 w-3" /> Missed</>
                  : draft ? "Draft"
                  : upcoming ? <><Lock className="h-3 w-3" /> Upcoming</>
                  : "Open"}
              </div>
            </button>
          );
        })}
      </div>

      <CycleForm
        founderId={founderId}
        cycleNumber={activeMeta.n}
        periodStart={activeMeta.start.toISOString().slice(0, 10)}
        periodEnd={activeMeta.end.toISOString().slice(0, 10)}
        deadline={activeMeta.deadline}
        existing={activeRow}
        isStaff={isStaff}
        onSaved={load}
      />

      {/* Mentor observations for this cycle */}
      <MentorObservationSection
        founderId={founderId}
        cycleNumber={activeMeta.n}
        submission={activeRow}
        observations={observations.filter((o) => o.cycle_number === activeMeta.n)}
        canAuthor={isStaff || isMentor}
        userId={user?.id ?? null}
        onSaved={load}
      />
    </div>
  );
}

/* =========== My Progress panel =========== */
function MyProgress({ founder, submittedCount, missedCount, totalCycles, currentCycle, evaluations }: {
  founder: any; submittedCount: number; missedCount: number; totalCycles: number; currentCycle: number; evaluations: any[];
}) {
  const pct = Math.round((submittedCount / totalCycles) * 100);
  const latest = evaluations[0];
  const status = latest?.status as "green" | "yellow" | "red" | undefined;
  const statusStyles: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    yellow: "bg-amber-100 text-amber-800 border-amber-300",
    red: "bg-rose-100 text-rose-800 border-rose-300",
  };
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <TrendingUp className="h-4 w-4 text-accent" />
        <CardTitle className="text-sm uppercase tracking-[0.18em]">My progress</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <Stat label="Stage" value={<span className="capitalize">{founder.lifecycle_stage ?? "—"}</span>} sub={<span className="capitalize text-muted-foreground">{founder.lifecycle_status}</span>} />
        <Stat
          label="Cycles submitted"
          value={<span className="font-display text-2xl">{submittedCount}<span className="text-sm text-muted-foreground">/{totalCycles}</span></span>}
          sub={
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{pct}%</span>
            </div>
          }
        />
        <Stat
          label="Current status"
          value={
            status ? (
              <Badge variant="outline" className={`${statusStyles[status]} capitalize`}>{status}</Badge>
            ) : <span className="text-muted-foreground text-sm">No review yet</span>
          }
          sub={
            missedCount > 0
              ? <span className="inline-flex items-center gap-1 text-rose-700 text-[11px]"><AlertTriangle className="h-3 w-3" /> {missedCount} missed cycle{missedCount > 1 ? "s" : ""}</span>
              : <span className="text-[11px] text-muted-foreground">On track · cycle #{currentCycle}</span>
          }
        />
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">Recent scores</div>
          {evaluations.length === 0 && <div className="text-xs text-muted-foreground">No evaluations yet.</div>}
          <div className="space-y-1">
            {evaluations.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">M{e.month_number} · {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className="font-mono">
                  {e.total_score}<span className="text-muted-foreground">/100</span>
                  {e.status && <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${e.status === "green" ? "bg-emerald-500" : e.status === "yellow" ? "bg-amber-500" : "bg-rose-500"}`} />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">{label}</div>
      <div className="text-sm">{value}</div>
      {sub && <div className="mt-1 text-xs">{sub}</div>}
    </div>
  );
}

/* =========== Cycle Form (with checklist + lock) =========== */
function CycleForm({ founderId, cycleNumber, periodStart, periodEnd, deadline, existing, isStaff, onSaved }: {
  founderId: string; cycleNumber: number; periodStart: string; periodEnd: string; deadline: Date;
  existing: Row | undefined; isStaff: boolean; onSaved: () => void;
}) {
  const [f, setF] = useState<any>(baseline());
  const [links, setLinks] = useState<{ title: string; url: string; check?: string }[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  function baseline() {
    return {
      progress_summary: "", wins: "", blockers: "",
      hours_worked: 0, customer_interviews: 0, features_shipped: 0,
      revenue: 0, users_acquired: 0, experiments_run: 0,
      mentor_meeting_date: "", mentor_meeting_notes: "",
      goals_next_cycle: "", ask_for_help: "",
    };
  }

  useEffect(() => {
    if (existing) {
      setF({
        progress_summary: existing.progress_summary ?? "",
        wins: existing.wins ?? "",
        blockers: existing.blockers ?? "",
        hours_worked: existing.hours_worked ?? 0,
        customer_interviews: existing.customer_interviews ?? 0,
        features_shipped: existing.features_shipped ?? 0,
        revenue: existing.revenue ?? 0,
        users_acquired: existing.users_acquired ?? 0,
        experiments_run: existing.experiments_run ?? 0,
        mentor_meeting_date: existing.mentor_meeting_date ?? "",
        mentor_meeting_notes: existing.mentor_meeting_notes ?? "",
        goals_next_cycle: existing.goals_next_cycle ?? "",
        ask_for_help: existing.ask_for_help ?? "",
      });
      const evLinks = Array.isArray(existing.evidence_links) ? existing.evidence_links : [];
      setLinks(evLinks);
      const map: Record<string, boolean> = {};
      evLinks.forEach((l: any) => { if (l.check) map[l.check] = true; });
      setChecked(map);
    } else {
      setF(baseline()); setLinks([]); setChecked({});
    }
  }, [existing?.id, cycleNumber]);

  const now = new Date();
  const submitted = !!existing?.submitted_at;
  const pastDeadline = deadline < now;
  // Locked for edits by students: submitted OR past deadline. Staff can always edit.
  const locked = !isStaff && (submitted || pastDeadline);
  const checklist = CHECKLISTS[cycleNumber];

  async function save(submit: boolean) {
    setSaving(true);
    // Attach checklist state onto evidence_links (extra items with just check key)
    const linksWithChecks = links.map((l) => ({ title: l.title, url: l.url, ...(l.check ? { check: l.check } : {}) }));
    const trackedCheckKeys = new Set(linksWithChecks.filter((l) => l.check).map((l) => l.check));
    const extra = Object.entries(checked)
      .filter(([k, v]) => v && !trackedCheckKeys.has(k))
      .map(([k]) => ({ title: checklist?.items.find((i) => i.key === k)?.label ?? k, url: "", check: k, self_confirmed: true }));

    const payload: any = {
      ...f, founder_id: founderId, cycle_number: cycleNumber,
      period_start: periodStart, period_end: periodEnd,
      evidence_links: [...linksWithChecks, ...extra],
      mentor_meeting_date: f.mentor_meeting_date || null,
    };
    if (submit) payload.submitted_at = new Date().toISOString();
    const { error } = await supabase
      .from("biweekly_submissions")
      .upsert(payload, { onConflict: "founder_id,cycle_number" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submit ? "Submitted to faculty" : "Draft saved");
    onSaved();
  }

  async function unlock() {
    if (!existing) return;
    if (!confirm("Unlock to edit? Faculty will see this as re-opened.")) return;
    const { error } = await supabase
      .from("biweekly_submissions").update({ submitted_at: null }).eq("id", existing.id);
    if (error) return toast.error(error.message);
    toast.success("Unlocked"); onSaved();
  }

  const requiredCount = checklist?.items.length ?? 0;
  const doneCount = checklist?.items.filter((i) => checked[i.key] || links.some((l) => l.check === i.key && l.url)).length ?? 0;

  const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Cycle {cycleNumber}
            {checklist && <span className="text-xs font-normal text-muted-foreground">· {checklist.stage}</span>}
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-0.5">
            {new Date(periodStart).toLocaleDateString()} – {new Date(periodEnd).toLocaleDateString()}
            <span className="mx-2">·</span>
            Deadline: <span className={pastDeadline ? "text-rose-600 font-medium" : daysToDeadline <= 3 ? "text-amber-700 font-medium" : ""}>
              {deadline.toLocaleDateString()}
            </span>
            {!pastDeadline && !submitted && (
              <span className="ml-1 text-[11px] text-muted-foreground">
                ({daysToDeadline} day{daysToDeadline === 1 ? "" : "s"} left)
              </span>
            )}
          </div>
        </div>
        <div className="text-xs flex items-center gap-2">
          {submitted && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
            </span>
          )}
          {!submitted && pastDeadline && (
            <span className="inline-flex items-center gap-1 text-rose-700">
              <Lock className="h-3.5 w-3.5" /> Missed & locked
            </span>
          )}
          {isStaff && (submitted || pastDeadline) && (
            <Button size="sm" variant="ghost" onClick={unlock}>Reopen (staff)</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evidence checklist */}
        {checklist && (
          <div className="rounded-md border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Required this cycle
              </div>
              <div className="text-xs font-mono">
                {doneCount}<span className="text-muted-foreground">/{requiredCount}</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {checklist.items.map((item) => {
                const hasLink = links.some((l) => l.check === item.key && l.url);
                const done = hasLink || !!checked[item.key];
                return (
                  <label key={item.key} className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer ${done ? "border-emerald-300/70 bg-emerald-50/40" : "border-border/70 bg-background"}`}>
                    <Checkbox
                      checked={done}
                      disabled={locked || hasLink}
                      onCheckedChange={(v) => setChecked({ ...checked, [item.key]: !!v })}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.hint && <div className="text-[10.5px] text-muted-foreground">{item.hint}</div>}
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => setLinks([...links, { title: item.label, url: "", check: item.key }])}
                          className="mt-1 text-[10.5px] text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Attach link
                        </button>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-3">
          <Num label="Hours worked" value={f.hours_worked} onChange={(v) => setF({ ...f, hours_worked: v })} disabled={locked} />
          <Num label="Customer interviews" value={f.customer_interviews} onChange={(v) => setF({ ...f, customer_interviews: v })} disabled={locked} />
          <Num label="Features shipped" value={f.features_shipped} onChange={(v) => setF({ ...f, features_shipped: v })} disabled={locked} />
          <Num label="Revenue (₹)" value={f.revenue} onChange={(v) => setF({ ...f, revenue: v })} disabled={locked} />
          <Num label="Users acquired" value={f.users_acquired} onChange={(v) => setF({ ...f, users_acquired: v })} disabled={locked} />
          <Num label="Experiments run" value={f.experiments_run} onChange={(v) => setF({ ...f, experiments_run: v })} disabled={locked} />
        </div>

        <Area label="Progress summary — what did you do these two weeks?"
          value={f.progress_summary} onChange={(v) => setF({ ...f, progress_summary: v })} disabled={locked} />
        <div className="grid md:grid-cols-2 gap-3">
          <Area label="Wins" value={f.wins} onChange={(v) => setF({ ...f, wins: v })} disabled={locked} />
          <Area label="Blockers / what failed"
            value={f.blockers} onChange={(v) => setF({ ...f, blockers: v })} disabled={locked} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mentor meeting date</Label>
            <Input type="date" value={f.mentor_meeting_date}
              onChange={(e) => setF({ ...f, mentor_meeting_date: e.target.value })}
              disabled={locked} className="mt-1" />
          </div>
          <Area label="Mentor meeting notes"
            value={f.mentor_meeting_notes} onChange={(v) => setF({ ...f, mentor_meeting_notes: v })} disabled={locked} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Evidence links</Label>
            {!locked && (
              <Button size="sm" variant="outline"
                onClick={() => setLinks([...links, { title: "", url: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add link
              </Button>
            )}
          </div>
          {links.length === 0 && <div className="text-xs text-muted-foreground">No evidence links yet. Add call recordings, demo videos, screenshots, or docs.</div>}
          {links.map((l, i) => (
            <div key={i} className="flex gap-2 items-center">
              {l.check && <Badge variant="outline" className="text-[10px]">req</Badge>}
              <Input placeholder="Title" value={l.title} disabled={locked}
                onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <Input placeholder="https://" value={l.url} disabled={locked}
                onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              {!locked && (
                <Button size="icon" variant="ghost"
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Area label="Goals for next cycle"
          value={f.goals_next_cycle} onChange={(v) => setF({ ...f, goals_next_cycle: v })} disabled={locked} />
        <Area label="Where do you need help?"
          value={f.ask_for_help} onChange={(v) => setF({ ...f, ask_for_help: v })} disabled={locked} />

        {!locked && (
          <div className="flex justify-between items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {requiredCount > 0 && doneCount < requiredCount && (
                <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" /> {requiredCount - doneCount} required item{requiredCount - doneCount > 1 ? "s" : ""} still missing.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save draft</Button>
              <Button size="sm" disabled={saving || !f.progress_summary} onClick={() => save(true)}>
                Submit cycle {cycleNumber}
              </Button>
            </div>
          </div>
        )}

        {locked && !submitted && (
          <div className="text-xs text-rose-700 bg-rose-50/60 border border-rose-200 rounded-md p-2 inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Deadline passed on {deadline.toLocaleDateString()}. Contact faculty to reopen.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* =========== Mentor Observation Section =========== */
function MentorObservationSection({ founderId, cycleNumber, submission, observations, canAuthor, userId, onSaved }: {
  founderId: string; cycleNumber: number; submission: any;
  observations: any[]; canAuthor: boolean; userId: string | null; onSaved: () => void;
}) {
  const evidenceLinks: any[] = Array.isArray(submission?.evidence_links) ? submission.evidence_links : [];
  const mine = observations.find((o) => o.author_id === userId);

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <MessageSquare className="h-4 w-4 text-accent" />
        <CardTitle className="text-sm uppercase tracking-[0.18em]">
          Mentor observation · Cycle {cycleNumber}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show existing observations */}
        {observations.length === 0 && !canAuthor && (
          <div className="text-xs text-muted-foreground">No mentor observations for this cycle yet.</div>
        )}
        {observations.map((o) => (
          <div key={o.id} className="rounded-md border border-border/70 p-3 space-y-2 bg-muted/20">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {new Date(o.updated_at ?? o.created_at).toLocaleString()}
            </div>
            <div className="text-sm whitespace-pre-wrap">{o.observation}</div>
            {o.strengths && <div className="text-xs"><strong className="text-emerald-700">Strengths:</strong> {o.strengths}</div>}
            {o.concerns && <div className="text-xs"><strong className="text-rose-700">Concerns:</strong> {o.concerns}</div>}
            {o.action_items && <div className="text-xs"><strong className="text-accent">Action items:</strong> {o.action_items}</div>}
            {Array.isArray(o.evidence_reviewed) && o.evidence_reviewed.length > 0 && (
              <div className="text-xs">
                <div className="text-muted-foreground mb-1">Evidence reviewed:</div>
                <ul className="space-y-0.5">
                  {o.evidence_reviewed.map((idx: number, i: number) => {
                    const link = evidenceLinks[idx];
                    if (!link) return null;
                    return (
                      <li key={i} className="inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {link.url ? (
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            {link.title || link.url}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{link.title}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ))}

        {canAuthor && (
          <ObservationForm
            founderId={founderId}
            cycleNumber={cycleNumber}
            userId={userId}
            existing={mine}
            evidenceLinks={evidenceLinks}
            onSaved={onSaved}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ObservationForm({ founderId, cycleNumber, userId, existing, evidenceLinks, onSaved }: {
  founderId: string; cycleNumber: number; userId: string | null; existing: any;
  evidenceLinks: any[]; onSaved: () => void;
}) {
  const [open, setOpen] = useState(!existing);
  const [f, setF] = useState({
    observation: existing?.observation ?? "",
    strengths: existing?.strengths ?? "",
    concerns: existing?.concerns ?? "",
    action_items: existing?.action_items ?? "",
  });
  const [reviewed, setReviewed] = useState<number[]>(Array.isArray(existing?.evidence_reviewed) ? existing.evidence_reviewed : []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setF({
      observation: existing?.observation ?? "",
      strengths: existing?.strengths ?? "",
      concerns: existing?.concerns ?? "",
      action_items: existing?.action_items ?? "",
    });
    setReviewed(Array.isArray(existing?.evidence_reviewed) ? existing.evidence_reviewed : []);
  }, [existing?.id, cycleNumber]);

  async function save() {
    if (!userId) return;
    if (!f.observation.trim()) return toast.error("Observation notes are required.");
    setSaving(true);
    const payload: any = {
      founder_id: founderId,
      cycle_number: cycleNumber,
      author_id: userId,
      ...f,
      evidence_reviewed: reviewed,
    };
    const { error } = await (supabase.from as any)("biweekly_mentor_observations")
      .upsert(payload, { onConflict: "founder_id,cycle_number,author_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Observation saved");
    setOpen(false);
    onSaved();
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {existing ? "Edit my observation" : "+ Add observation"}
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border/70 p-3 space-y-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {existing ? "Edit your observation" : "New observation"}
      </div>
      <Area label="Observation (required)" value={f.observation} onChange={(v) => setF({ ...f, observation: v })} />
      <div className="grid md:grid-cols-2 gap-3">
        <Area label="Strengths" value={f.strengths} onChange={(v) => setF({ ...f, strengths: v })} />
        <Area label="Concerns" value={f.concerns} onChange={(v) => setF({ ...f, concerns: v })} />
      </div>
      <Area label="Action items for founder" value={f.action_items} onChange={(v) => setF({ ...f, action_items: v })} />

      {evidenceLinks.length > 0 && (
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Link to reviewed evidence</Label>
          <div className="mt-1 grid sm:grid-cols-2 gap-1.5">
            {evidenceLinks.map((l, i) => {
              const checked = reviewed.includes(i);
              return (
                <label key={i} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer ${checked ? "border-accent bg-accent/5" : "border-border/70"}`}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setReviewed(v ? [...reviewed, i] : reviewed.filter((x) => x !== i))}
                  />
                  <span className="flex-1 truncate">{l.title || l.url || `Item ${i + 1}`}</span>
                  {l.url && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" disabled={saving} onClick={save}>Save observation</Button>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="number" value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))} className="mt-1" />
    </div>
  );
}

function Area({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} className="mt-1" />
    </div>
  );
}
