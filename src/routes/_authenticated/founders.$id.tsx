import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/app/app-shell";
import { ArrowLeft, Plus, FileText, Award, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/founders/$id")({
  component: FounderDetail,
});

const RECOMMENDATIONS = [
  { v: "continue", l: "Continue" },
  { v: "continue_monitoring", l: "Continue with Monitoring" },
  { v: "probation", l: "Probation" },
  { v: "return_to_academic", l: "Return to Academic Track" },
];

function FounderDetail() {
  const { id } = Route.useParams();
  const { isStaff, user } = useAuth();
  const [founder, setFounder] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [obs, setObs] = useState<any[]>([]);

  const load = async () => {
    const [{ data: f }, { data: s }, { data: e }, { data: o }] = await Promise.all([
      supabase.from("founders").select("*").eq("id", id).single(),
      supabase.from("monthly_submissions").select("*").eq("founder_id", id).order("year").order("month_number"),
      supabase.from("evaluations").select("*").eq("founder_id", id).order("year").order("month_number"),
      supabase.from("mentor_observations").select("*").eq("founder_id", id).order("created_at", { ascending: false }),
    ]);
    setFounder(f); setSubs(s ?? []); setEvals(e ?? []); setObs(o ?? []);
  };
  useEffect(() => { load(); }, [id]);

  if (!founder) return <div className="text-muted-foreground">Loading...</div>;

  // Consecutive flags
  const last2 = evals.slice(-2);
  const twoYellow = last2.length === 2 && last2.every(e => e.status === "yellow");
  const twoRed = last2.length === 2 && last2.every(e => e.status === "red");

  return (
    <div className="space-y-6">
      <Link to="/founders" className="text-xs uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center hover:text-foreground transition-colors">
        <ArrowLeft className="h-3 w-3 mr-1.5" />Portfolio
      </Link>
      <div className="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-border/70">
        <div className="space-y-2">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Founder profile</div>
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight">{founder.founder_name}</h1>
          <p className="text-muted-foreground">
            <span className="text-foreground/85 font-medium">{founder.startup_name}</span> · {founder.industry || "—"}
          </p>
          <div className="flex gap-1.5 mt-2 text-xs flex-wrap items-center">
            <Tag>{founder.campus || "No campus"}</Tag>
            <Tag>Sem {founder.semester || "—"}</Tag>
            <Tag>Team · {founder.team_size}</Tag>
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage</span>
              <Select
                value={founder.lifecycle_stage ?? founder.stage}
                onValueChange={async (v) => {
                  const { error } = await supabase.from("founders").update({ lifecycle_stage: v } as any).eq("id", id);
                  if (error) return toast.error(error.message);
                  toast.success("Stage updated"); load();
                }}
              >
                <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["idea","discovery","validation","mvp","pilot","revenue","growth","fundraising"].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <NewSubmissionDialog founderId={id} onSaved={load} />
          {isStaff && <NewEvaluationDialog founderId={id} submissions={subs} onSaved={load} />}
        </div>
      </div>

      {(twoYellow || twoRed) && (
        <Card className={twoRed ? "border-rose-300/70 bg-rose-50/40" : "border-amber-300/70 bg-amber-50/40"}>
          <CardContent className="pt-4 text-sm">
            <strong className="font-display">{twoRed ? "Academic Review Board" : "Faculty Review"}:</strong> {twoRed ? "Two consecutive At-Risk reviews." : "Two consecutive Watch reviews."} A formal review is recommended.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="submissions">Submissions ({subs.length})</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations ({evals.length})</TabsTrigger>
          <TabsTrigger value="observations">Mentor Notes ({obs.length})</TabsTrigger>
          <TabsTrigger value="review">Review Board</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-6 gap-3">
                {[1,2,3,4,5,6].map((m) => {
                  const ev = evals.find(e => e.month_number === m);
                  return (
                    <div key={m} className="border rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground">Month {m}</div>
                      <div className="text-2xl font-semibold my-2 font-mono">{ev?.total_score ?? "—"}</div>
                      <StatusBadge status={ev?.status} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4 space-y-3">
          {subs.length === 0 && <Empty text="No monthly submissions yet." />}
          {subs.map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Month {s.month_number} · {s.year}</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
                <Section title="Customer Discovery">
                  <KV k="Interviews" v={s.interviews_conducted} />
                  <KV k="Key learnings" v={s.key_learnings} />
                  <KV k="Assumptions invalidated" v={s.assumptions_invalidated} />
                </Section>
                <Section title="Product">
                  <KV k="Features built" v={s.features_built} />
                  <KV k="Iterations" v={s.iterations_completed} />
                  <KV k="Demo" v={s.demo_link ? <a className="text-primary underline" href={s.demo_link} target="_blank">link</a> : "—"} />
                </Section>
                <Section title="Business">
                  <KV k="Users" v={s.total_users} />
                  <KV k="Active" v={s.active_users} />
                  <KV k="Revenue" v={`₹${s.revenue}`} />
                  <KV k="Pilots" v={s.pilots} />
                  <KV k="Partnerships" v={s.partnerships} />
                </Section>
                <Section title="Reflection" className="md:col-span-3">
                  <KV k="Biggest learning" v={s.biggest_learning} />
                  <KV k="Biggest failure" v={s.biggest_failure} />
                  <KV k="What changed" v={s.what_changed} />
                </Section>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4 space-y-3">
          {evals.length === 0 && <Empty text="No evaluations yet." />}
          {evals.map(e => (
            <Card key={e.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Month {e.month_number} · {e.year}</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl">{e.total_score}<span className="text-sm text-muted-foreground">/100</span></span>
                  <StatusBadge status={e.status} />
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-4 gap-3 text-sm">
                <ScoreBlock label="Execution & Product" score={e.execution_score} max={40} comment={e.execution_comment} />
                <ScoreBlock label="Customer & Market" score={e.customer_score} max={25} comment={e.customer_comment} />
                <ScoreBlock label="Business & Metrics" score={e.business_score} max={20} comment={e.business_comment} />
                <ScoreBlock label="Founder Behaviour" score={e.behavior_score} max={15} comment={e.behavior_comment} />
                {e.overall_comment && <div className="md:col-span-4 text-sm bg-muted/50 rounded p-3"><strong>Overall:</strong> {e.overall_comment}</div>}
                {e.recommendation && <div className="md:col-span-4 text-sm"><strong>Recommendation:</strong> {RECOMMENDATIONS.find(r => r.v === e.recommendation)?.l}</div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="observations" className="mt-4 space-y-3">
          <MentorObservationForm founderId={id} onSaved={load} mentorId={user?.id} />
          {obs.length === 0 && <Empty text="No mentor observations yet." />}
          {obs.map(o => (
            <Card key={o.id}><CardContent className="pt-4 text-sm">
              <div className="text-xs text-muted-foreground mb-1">{new Date(o.created_at).toLocaleDateString()}</div>
              <div className="whitespace-pre-wrap">{o.notes}</div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ReviewBoard founder={founder} evals={evals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">{children}</span>;
}
function Empty({ text }: { text: string }) { return <div className="text-center text-muted-foreground py-12 border rounded-lg bg-card">{text}</div>; }
function Section({ title, children, className }: any) {
  return <div className={className}><div className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</div><div className="space-y-1">{children}</div></div>;
}
function KV({ k, v }: { k: string; v: any }) {
  return <div className="text-sm"><span className="text-muted-foreground">{k}:</span> <span>{v ?? "—"}</span></div>;
}
function ScoreBlock({ label, score, max, comment }: any) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xl mt-1">{score}<span className="text-xs text-muted-foreground">/{max}</span></div>
      {comment && <div className="text-xs text-muted-foreground mt-1 italic">{comment}</div>}
    </div>
  );
}

/* ---- Dialogs ---- */

function NewSubmissionDialog({ founderId, onSaved }: { founderId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [f, setF] = useState<any>({
    month_number: now.getMonth()+1, year: now.getFullYear(),
    interviews_conducted: 0, key_learnings: "", assumptions_invalidated: "",
    features_built: "", iterations_completed: 0, demo_link: "",
    total_users: 0, active_users: 0, revenue: 0, pilots: 0, partnerships: 0,
    biggest_learning: "", biggest_failure: "", what_changed: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("monthly_submissions").insert({ ...f, founder_id: founderId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Submission saved"); setOpen(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" />Submit Update</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Monthly Submission</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumF label="Month (1-12)" value={f.month_number} onChange={(v)=>setF({...f, month_number: v})} />
            <NumF label="Year" value={f.year} onChange={(v)=>setF({...f, year: v})} />
          </div>
          <fieldset className="border rounded p-3"><legend className="px-1 text-xs uppercase text-muted-foreground">Customer Discovery</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumF label="Interviews conducted" value={f.interviews_conducted} onChange={(v)=>setF({...f, interviews_conducted: v})} />
              <div></div>
              <TextF label="Key learnings" value={f.key_learnings} onChange={(v)=>setF({...f, key_learnings: v})} />
              <TextF label="Assumptions invalidated" value={f.assumptions_invalidated} onChange={(v)=>setF({...f, assumptions_invalidated: v})} />
            </div>
          </fieldset>
          <fieldset className="border rounded p-3"><legend className="px-1 text-xs uppercase text-muted-foreground">Product</legend>
            <div className="grid grid-cols-2 gap-3">
              <TextF label="Features built" value={f.features_built} onChange={(v)=>setF({...f, features_built: v})} />
              <NumF label="Iterations completed" value={f.iterations_completed} onChange={(v)=>setF({...f, iterations_completed: v})} />
              <div className="col-span-2"><Label>Demo link</Label><Input value={f.demo_link} onChange={(e)=>setF({...f, demo_link: e.target.value})} /></div>
            </div>
          </fieldset>
          <fieldset className="border rounded p-3"><legend className="px-1 text-xs uppercase text-muted-foreground">Business Metrics</legend>
            <div className="grid grid-cols-5 gap-3">
              <NumF label="Users" value={f.total_users} onChange={(v)=>setF({...f, total_users: v})} />
              <NumF label="Active" value={f.active_users} onChange={(v)=>setF({...f, active_users: v})} />
              <NumF label="Revenue ₹" value={f.revenue} onChange={(v)=>setF({...f, revenue: v})} />
              <NumF label="Pilots" value={f.pilots} onChange={(v)=>setF({...f, pilots: v})} />
              <NumF label="Partnerships" value={f.partnerships} onChange={(v)=>setF({...f, partnerships: v})} />
            </div>
          </fieldset>
          <fieldset className="border rounded p-3"><legend className="px-1 text-xs uppercase text-muted-foreground">Founder Reflection</legend>
            <div className="grid grid-cols-3 gap-3">
              <TextF label="Biggest learning" value={f.biggest_learning} onChange={(v)=>setF({...f, biggest_learning: v})} />
              <TextF label="Biggest failure" value={f.biggest_failure} onChange={(v)=>setF({...f, biggest_failure: v})} />
              <TextF label="What changed" value={f.what_changed} onChange={(v)=>setF({...f, what_changed: v})} />
            </div>
          </fieldset>
          <DialogFooter><Button disabled={saving}>{saving ? "Saving..." : "Submit"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewEvaluationDialog({ founderId, submissions, onSaved }: { founderId: string; submissions: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [f, setF] = useState<any>({
    month_number: now.getMonth()+1, year: now.getFullYear(), submission_id: null,
    execution_score: 0, customer_score: 0, business_score: 0, behavior_score: 0,
    execution_comment: "", customer_comment: "", business_comment: "", behavior_comment: "",
    overall_comment: "", recommendation: null, manual_override: false, status: null,
  });
  const [saving, setSaving] = useState(false);
  const total = (f.execution_score||0)+(f.customer_score||0)+(f.business_score||0)+(f.behavior_score||0);
  const autoStatus = total >= 70 ? "green" : total >= 50 ? "yellow" : "red";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = { ...f, founder_id: founderId, evaluator_id: user?.id };
    if (!payload.submission_id) delete payload.submission_id;
    if (!payload.recommendation) delete payload.recommendation;
    if (!payload.status) delete payload.status;
    const { error } = await supabase.from("evaluations").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Evaluation saved"); setOpen(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Award className="h-4 w-4 mr-1" />New Evaluation</Button></DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Monthly Evaluation</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <NumF label="Month" value={f.month_number} onChange={(v)=>setF({...f, month_number: v})} />
            <NumF label="Year" value={f.year} onChange={(v)=>setF({...f, year: v})} />
            <div>
              <Label>Linked Submission</Label>
              <Select value={f.submission_id ?? "none"} onValueChange={(v)=>setF({...f, submission_id: v==="none"?null:v})}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {submissions.map(s => <SelectItem key={s.id} value={s.id}>M{s.month_number} {s.year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ScoreInput label="Execution & Product Development" max={40} score={f.execution_score} setScore={(v)=>setF({...f, execution_score: v})} comment={f.execution_comment} setComment={(v)=>setF({...f, execution_comment: v})} />
          <ScoreInput label="Customer & Market Development" max={25} score={f.customer_score} setScore={(v)=>setF({...f, customer_score: v})} comment={f.customer_comment} setComment={(v)=>setF({...f, customer_comment: v})} />
          <ScoreInput label="Business & Metrics Management" max={20} score={f.business_score} setScore={(v)=>setF({...f, business_score: v})} comment={f.business_comment} setComment={(v)=>setF({...f, business_comment: v})} />
          <ScoreInput label="Founder Behaviour" max={15} score={f.behavior_score} setScore={(v)=>setF({...f, behavior_score: v})} comment={f.behavior_comment} setComment={(v)=>setF({...f, behavior_comment: v})} />
          <div className="flex items-center justify-between bg-muted/50 rounded p-3">
            <div className="font-mono text-2xl">Total: {total}/100</div>
            <StatusBadge status={autoStatus as any} />
          </div>
          <TextF label="Overall comment" value={f.overall_comment} onChange={(v)=>setF({...f, overall_comment: v})} />
          <div>
            <Label>Recommendation</Label>
            <Select value={f.recommendation ?? "none"} onValueChange={(v)=>setF({...f, recommendation: v==="none"?null:v})}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {RECOMMENDATIONS.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button disabled={saving}>{saving ? "Saving..." : "Save Evaluation"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScoreInput({ label, max, score, setScore, comment, setComment }: { label: string; max: number; score: number; setScore: (v: number) => void; comment: string; setComment: (v: string) => void }) {
  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2"><Input type="number" min={0} max={max} value={score} onChange={(e)=>setScore(Math.min(max, Math.max(0, Number(e.target.value)||0)))} className="w-20 text-right font-mono" /><span className="text-sm text-muted-foreground">/ {max}</span></div>
      </div>
      <Textarea placeholder="Comment..." value={comment} onChange={(e)=>setComment(e.target.value)} rows={2} />
    </div>
  );
}
function NumF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <div><Label>{label}</Label><Input type="number" value={value} onChange={(e)=>onChange(Number(e.target.value)||0)} /></div>; }
function TextF({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <div><Label>{label}</Label><Textarea value={value} onChange={(e)=>onChange(e.target.value)} rows={2} /></div>; }

function MentorObservationForm({ founderId, mentorId, onSaved }: { founderId: string; mentorId?: string; onSaved: () => void }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mentorId || !notes.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("mentor_observations").insert({ founder_id: founderId, mentor_id: mentorId, notes });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNotes(""); onSaved();
  }
  return (
    <Card><CardContent className="pt-4">
      <form onSubmit={submit} className="space-y-2">
        <Label className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />Add observation</Label>
        <Textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="Mentor notes about this founder..." />
        <Button size="sm" disabled={saving || !notes.trim()}>{saving ? "Saving..." : "Add note"}</Button>
      </form>
    </CardContent></Card>
  );
}

function ReviewBoard({ founder, evals }: { founder: any; evals: any[] }) {
  const scores = evals.map(e => e.total_score ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  const last = evals[evals.length-1];
  const trend = scores.length >= 2 ? (scores[scores.length-1] - scores[0]) : 0;
  const strengths: string[] = [];
  const concerns: string[] = [];
  if (last) {
    if (last.execution_score >= 30) strengths.push("Strong execution and product velocity");
    if (last.customer_score >= 18) strengths.push("Solid customer discovery work");
    if (last.business_score >= 15) strengths.push("Healthy business metrics");
    if (last.behavior_score >= 12) strengths.push("Disciplined founder behaviour");
    if (last.execution_score < 20) concerns.push("Low execution / product progress");
    if (last.customer_score < 12) concerns.push("Limited customer validation");
    if (last.business_score < 10) concerns.push("Weak business traction");
    if (last.behavior_score < 8) concerns.push("Accountability / behaviour issues");
  }
  let rec = "continue";
  if (avg < 50) rec = "return_to_academic";
  else if (avg < 60) rec = "probation";
  else if (avg < 70) rec = "continue_monitoring";

  function exportCSV() {
    const lines = [
      ["Founder", founder.founder_name],
      ["Startup", founder.startup_name],
      ["Campus", founder.campus ?? ""],
      ["Stage", founder.stage],
      ["Average Score", String(avg)],
      ["Trend", String(trend)],
      [""],
      ["Month","Year","Execution","Customer","Business","Behaviour","Total","Status"],
      ...evals.map(e => [String(e.month_number), String(e.year), String(e.execution_score), String(e.customer_score), String(e.business_score), String(e.behavior_score), String(e.total_score), e.status ?? ""]),
      [""],
      ["Strengths", ...strengths],
      ["Concerns", ...concerns],
      ["Recommendation", RECOMMENDATIONS.find(r=>r.v===rec)?.l ?? ""],
    ];
    const csv = lines.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${founder.startup_name}-review.csv`; a.click();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Startup Review Summary</CardTitle>
        <Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Average Score</div><div className="text-2xl font-mono">{avg}/100</div></div>
          <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Reviews</div><div className="text-2xl font-mono">{evals.length}</div></div>
          <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Trend</div><div className={`text-2xl font-mono ${trend>=0?"text-emerald-600":"text-rose-600"}`}>{trend>=0?"+":""}{trend}</div></div>
        </div>
        <div>
          <div className="font-medium mb-1">Strengths</div>
          {strengths.length ? <ul className="list-disc pl-5 space-y-1">{strengths.map((s,i)=><li key={i}>{s}</li>)}</ul> : <div className="text-muted-foreground">No clear strengths identified yet.</div>}
        </div>
        <div>
          <div className="font-medium mb-1">Concerns</div>
          {concerns.length ? <ul className="list-disc pl-5 space-y-1">{concerns.map((s,i)=><li key={i}>{s}</li>)}</ul> : <div className="text-muted-foreground">No major concerns.</div>}
        </div>
        <div className="border-t pt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Suggested Recommendation</div>
          <div className="text-lg font-semibold">{RECOMMENDATIONS.find(r=>r.v===rec)?.l}</div>
          <div className="text-xs text-muted-foreground">Auto-derived from average score. Faculty may override per evaluation.</div>
        </div>
      </CardContent>
    </Card>
  );
}
