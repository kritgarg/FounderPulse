import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/onboarding")({
  component: Onboarding,
});

const STAGES = [
  { v: "idea", d: "Idea — no product yet, still shaping the problem" },
  { v: "discovery", d: "Discovery — talking to users, validating problem" },
  { v: "validation", d: "Validation — prototype, testing willingness to pay" },
  { v: "mvp", d: "MVP — early product live, first users" },
  { v: "pilot", d: "Pilot — paid pilots or design partners" },
  { v: "revenue", d: "Revenue — consistent paying customers" },
  { v: "growth", d: "Growth — scaling GTM and team" },
  { v: "fundraising", d: "Fundraising — actively raising a round" },
] as const;

type Form = {
  one_liner: string;
  problem_statement: string;
  target_customer: string;
  current_stage: string;
  business_model: string;
  traction_summary: string;
  key_assumptions: string;
  top_risks: string;
  six_month_goals: string;
  capital_status: string;
  weekly_hours_committed: number;
  cofounders: string;
  tech_stack: string;
  website_url: string;
  demo_url: string;
  deck_url: string;
};

const EMPTY: Form = {
  one_liner: "", problem_statement: "", target_customer: "", current_stage: "idea",
  business_model: "", traction_summary: "", key_assumptions: "", top_risks: "",
  six_month_goals: "", capital_status: "", weekly_hours_committed: 40,
  cofounders: "", tech_stack: "", website_url: "", demo_url: "", deck_url: "",
};

function Onboarding() {
  const { founderId, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [existing, setExisting] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!founderId) return;
    (async () => {
      const { data } = await supabase
        .from("founder_intakes").select("*").eq("founder_id", founderId).maybeSingle();
      if (data) {
        setExisting(data);
        setF({
          one_liner: data.one_liner ?? "",
          problem_statement: data.problem_statement ?? "",
          target_customer: data.target_customer ?? "",
          current_stage: data.current_stage ?? "idea",
          business_model: data.business_model ?? "",
          traction_summary: data.traction_summary ?? "",
          key_assumptions: data.key_assumptions ?? "",
          top_risks: data.top_risks ?? "",
          six_month_goals: data.six_month_goals ?? "",
          capital_status: data.capital_status ?? "",
          weekly_hours_committed: data.weekly_hours_committed ?? 40,
          cofounders: data.cofounders ?? "",
          tech_stack: data.tech_stack ?? "",
          website_url: data.website_url ?? "",
          demo_url: data.demo_url ?? "",
          deck_url: data.deck_url ?? "",
        });
      }
      setReady(true);
    })();
  }, [founderId]);

  if (loading || !ready) return <div className="text-muted-foreground">Loading…</div>;
  if (!founderId && !isStaff) return <Navigate to="/os" replace />;
  if (!founderId) return <div className="text-muted-foreground">Onboarding is for founders only.</div>;

  async function save(submit: boolean) {
    setSaving(true);
    const payload: any = { ...f, founder_id: founderId };
    if (submit) payload.submitted_at = new Date().toISOString();
    const { error } = existing
      ? await supabase.from("founder_intakes").update(payload).eq("id", existing.id)
      : await supabase.from("founder_intakes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    if (submit) {
      toast.success("Master intake submitted — bi-weekly cycles are now live");
      navigate({ to: "/os/biweekly" });
    } else {
      toast.success("Draft saved");
    }
  }

  const steps = [
    {
      title: "The one-liner",
      body: (
        <div className="space-y-4">
          <FieldT label="Startup one-liner (max 140 chars)"
            hint="If a stranger read only this line, would they get it?"
            value={f.one_liner} onChange={(v) => setF({ ...f, one_liner: v.slice(0, 140) })} />
          <FieldT label="The problem you're solving"
            hint="Whose life is worse today, and how?"
            value={f.problem_statement} onChange={(v) => setF({ ...f, problem_statement: v })} rows={4} />
          <FieldT label="Target customer (who, specifically)"
            hint="Age, role, geography, buying context. Be concrete."
            value={f.target_customer} onChange={(v) => setF({ ...f, target_customer: v })} rows={3} />
        </div>
      ),
    },
    {
      title: "Where you are today",
      body: (
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Current stage</Label>
            <Select value={f.current_stage} onValueChange={(v) => setF({ ...f, current_stage: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.v} value={s.v}>
                    <div><div className="capitalize font-medium">{s.v}</div>
                    <div className="text-xs text-muted-foreground">{s.d}</div></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">This drives your bi-weekly evaluation rubric.</p>
          </div>
          <FieldT label="Current traction"
            hint="Users, revenue, LOIs, waitlist, interviews done. Numbers > adjectives."
            value={f.traction_summary} onChange={(v) => setF({ ...f, traction_summary: v })} rows={3} />
          <FieldT label="Business model"
            hint="How does money flow? Who pays what, when?"
            value={f.business_model} onChange={(v) => setF({ ...f, business_model: v })} rows={3} />
        </div>
      ),
    },
    {
      title: "Assumptions & risks",
      body: (
        <div className="space-y-4">
          <FieldT label="Top 3 assumptions you'll test in the next 6 months"
            hint="One per line. These become the checkpoints for every bi-weekly review."
            value={f.key_assumptions} onChange={(v) => setF({ ...f, key_assumptions: v })} rows={5} />
          <FieldT label="Top 3 risks that could kill this"
            hint="Technical, regulatory, market, team — be honest."
            value={f.top_risks} onChange={(v) => setF({ ...f, top_risks: v })} rows={4} />
          <FieldT label="Six-month goals"
            hint="What must be true by month 6 for this to be a success?"
            value={f.six_month_goals} onChange={(v) => setF({ ...f, six_month_goals: v })} rows={4} />
        </div>
      ),
    },
    {
      title: "Team, capital, links",
      body: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <FieldT label="Co-founders (name, role)" value={f.cofounders} onChange={(v) => setF({ ...f, cofounders: v })} rows={3} />
            <FieldT label="Tech stack / tooling" value={f.tech_stack} onChange={(v) => setF({ ...f, tech_stack: v })} rows={3} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <FieldT label="Capital status" hint="Bootstrapped, grants, angel, seed, etc."
              value={f.capital_status} onChange={(v) => setF({ ...f, capital_status: v })} rows={2} />
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weekly hours committed</Label>
              <Input type="number" value={f.weekly_hours_committed}
                onChange={(e) => setF({ ...f, weekly_hours_committed: Number(e.target.value) })} className="mt-1" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Website</Label>
              <Input value={f.website_url} onChange={(e) => setF({ ...f, website_url: e.target.value })} placeholder="https://" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Demo / product link</Label>
              <Input value={f.demo_url} onChange={(e) => setF({ ...f, demo_url: e.target.value })} placeholder="https://" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Deck</Label>
              <Input value={f.deck_url} onChange={(e) => setF({ ...f, deck_url: e.target.value })} placeholder="https://" className="mt-1" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Review & submit",
      body: (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Once submitted, this becomes the baseline your bi-weekly reviews are scored against.
            You can update it later, but assumptions and stage changes should be intentional.
          </p>
          <Row k="One-liner" v={f.one_liner} />
          <Row k="Stage" v={f.current_stage} />
          <Row k="Target customer" v={f.target_customer} />
          <Row k="Traction" v={f.traction_summary} />
          <Row k="Six-month goals" v={f.six_month_goals} />
          <Row k="Weekly hours" v={String(f.weekly_hours_committed)} />
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const alreadySubmitted = !!existing?.submitted_at;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Day 1 · Master intake</div>
          <div className="font-display text-2xl tracking-tight">Tell us where your startup is today</div>
        </div>
      </div>

      {alreadySubmitted && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Intake submitted on {new Date(existing.submitted_at).toLocaleDateString()}. Editing will update your baseline.
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{steps[step].title}</span>
            <span className="text-xs text-muted-foreground font-normal">Step {step + 1} of {steps.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>{steps[step].body}</CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save draft</Button>
          {isLast ? (
            <Button size="sm" disabled={saving || !f.one_liner || !f.problem_statement} onClick={() => save(true)}>
              Submit intake
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
              Next <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldT({ label, hint, value, onChange, rows = 2 }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1.5" />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-t border-border/60 pt-2">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{k}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{v || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
