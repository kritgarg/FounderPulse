import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/app-shell";
import { ArrowLeft, Upload, Link as LinkIcon, FileText, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/workspace/$founderId")({
  component: Workspace,
});

const STAGES = ["idea","discovery","validation","mvp","pilot","revenue","growth","fundraising"] as const;
const STATUSES = ["active","paused","pivoted","merged","acquired","closed"] as const;
const MONTHS = [
  { n: 1, label: "Problem Discovery" }, { n: 2, label: "Customer Validation" },
  { n: 3, label: "MVP" }, { n: 4, label: "Pilot" },
  { n: 5, label: "Traction" }, { n: 6, label: "Final Venture Defense" },
];

function Workspace() {
  const { founderId } = Route.useParams();
  const { isStaff, founderId: myFounder, user } = useAuth();
  const isOwner = myFounder === founderId;
  const canEdit = isOwner || isStaff;

  const [founder, setFounder] = useState<any>(null);
  const [packets, setPackets] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [aiEvals, setAiEvals] = useState<any[]>([]);
  const [mentor, setMentor] = useState<any>(null);
  const [credits, setCredits] = useState<any[]>([]);

  const load = async () => {
    const [{ data: f }, { data: p }, { data: w }, { data: e }, { data: k }, { data: r }, { data: c }] = await Promise.all([
      supabase.from("founders").select("*").eq("id", founderId).maybeSingle(),
      supabase.from("submission_packets").select("*").eq("founder_id", founderId).order("month"),
      supabase.from("weekly_trackers").select("*").eq("founder_id", founderId).order("week_start", { ascending: false }),
      supabase.from("evidence_items").select("*").eq("founder_id", founderId).order("created_at", { ascending: false }),
      supabase.from("kpi_snapshots").select("*").eq("founder_id", founderId).order("month"),
      supabase.from("faculty_reviews").select("*").eq("founder_id", founderId).order("created_at", { ascending: false }),
      supabase.from("academic_credits").select("*").eq("founder_id", founderId),
    ]);
    setFounder(f); setPackets(p ?? []); setWeekly(w ?? []); setEvidence(e ?? []);
    setKpis(k ?? []); setReviews(r ?? []); setCredits(c ?? []);
    if ((f as any)?.mentor_id) {
      const { data: m } = await supabase.from("mentors").select("*").eq("id", (f as any).mentor_id).maybeSingle();
      setMentor(m);
    }
    if (p && p.length > 0) {
      const ids = p.map((x: any) => x.id);
      const { data: ai } = await supabase.from("ai_evaluations").select("*").in("packet_id", ids);
      setAiEvals(ai ?? []);
    }
  };
  useEffect(() => { load(); }, [founderId]);

  async function updateLifecycle(field: "lifecycle_stage" | "lifecycle_status", value: string) {
    const { error } = await supabase.from("founders").update({ [field]: value } as any).eq("id", founderId);
    if (error) return toast.error(error.message);
    toast.success(field === "lifecycle_stage" ? "Stage updated" : "Status updated");
    load();
  }

  const latestReview = reviews.find((r) => r.decision === "approve");
  const greenYellowRed: "green"|"yellow"|"red"|undefined = latestReview?.status;

  if (!founder) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/os" className="text-xs uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center hover:text-foreground">
        <ArrowLeft className="h-3 w-3 mr-1.5" /> Venture OS
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Startup workspace</div>
          <h1 className="font-display text-4xl tracking-tight">{founder.startup_name}</h1>
          <p className="text-muted-foreground mt-1">{founder.founder_name} · {founder.industry || "—"}</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={greenYellowRed ?? null} />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest score</div>
            <div className="font-display text-2xl">{latestReview?.total_score ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <InfoCard label="Stage" value={
          canEdit ? (
            <Select value={founder.lifecycle_stage} onValueChange={(v) => updateLifecycle("lifecycle_stage", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          ) : <span className="capitalize">{founder.lifecycle_stage}</span>
        } />
        <InfoCard label="Status" value={
          canEdit ? (
            <Select value={founder.lifecycle_status} onValueChange={(v) => updateLifecycle("lifecycle_status", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          ) : <span className="capitalize">{founder.lifecycle_status}</span>
        } />
        <InfoCard label="Mentor" value={mentor?.name ?? "—"} />
        <InfoCard label="Next review" value={founder.next_review_date ?? "—"} />
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2"><CardTitle className="text-base">6-month progress</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {MONTHS.map((m) => {
              const packet = packets.find((p) => p.month === m.n);
              const review = reviews.find((r) => r.decision === "approve" && packets.find((p) => p.id === r.packet_id)?.month === m.n);
              return (
                <div key={m.n} className="border border-border/60 rounded-md p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Month {m.n}</div>
                  <div className="text-xs mt-0.5">{m.label}</div>
                  <div className="font-display text-xl mt-2">{review?.total_score ?? "—"}</div>
                  <div className="mt-1"><StatusBadge status={review?.status ?? null} /></div>
                  {packet?.submitted_at && <div className="text-[10px] text-muted-foreground mt-1">Submitted</div>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="monthly">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Tracker</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Vault</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4 space-y-3">
          <MonthlyPanel founderId={founderId} packets={packets} aiEvals={aiEvals} canEdit={isOwner} onSaved={load} />
        </TabsContent>

        <TabsContent value="weekly" className="mt-4 space-y-3">
          <WeeklyPanel founderId={founderId} weekly={weekly} canEdit={isOwner} onSaved={load} />
        </TabsContent>

        <TabsContent value="evidence" className="mt-4 space-y-3">
          <EvidencePanel founderId={founderId} items={evidence} canEdit={isOwner} onSaved={load} />
        </TabsContent>

        <TabsContent value="kpis" className="mt-4 space-y-3">
          <KpiPanel kpis={kpis} weekly={weekly} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {reviews.filter((r) => r.decision === "approve").length === 0 && <Empty text="No approved reviews yet." />}
          {reviews.filter((r) => r.decision === "approve").map((r) => (
            <Card key={r.id} className="border-border/70 shadow-none">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Review · {new Date(r.decided_at ?? r.created_at).toLocaleDateString()}</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl">{r.total_score}<span className="text-xs text-muted-foreground">/100</span></span>
                  <StatusBadge status={r.status} />
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-4 gap-3 text-sm">
                <Sc label="Execution" v={r.execution_score} m={40} />
                <Sc label="Customer" v={r.customer_score} m={25} />
                <Sc label="Business" v={r.business_score} m={20} />
                <Sc label="Behaviour" v={r.behavior_score} m={15} />
                {r.comments && <div className="md:col-span-4 text-sm bg-muted/50 rounded p-3"><strong>Faculty:</strong> {r.comments}</div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="credits" className="mt-4 space-y-3">
          <CreditsPanel credits={credits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="pt-4 pb-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">{label}</div>
        <div className="text-sm">{value}</div>
      </CardContent>
    </Card>
  );
}

function Sc({ label, v, m }: any) {
  return (
    <div className="border border-border/70 rounded-md p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-lg mt-1">{v ?? 0}<span className="text-xs text-muted-foreground">/{m}</span></div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center text-muted-foreground py-10 border border-dashed border-border/70 rounded-lg">{text}</div>;
}

/* ============ Monthly ============ */
function MonthlyPanel({ founderId, packets, aiEvals, canEdit, onSaved }: any) {
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const editing = packets.find((p: any) => p.month === editingMonth);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-2">
        {MONTHS.map((m) => {
          const packet = packets.find((p: any) => p.month === m.n);
          return (
            <Button
              key={m.n}
              variant={editingMonth === m.n ? "default" : "outline"}
              size="sm"
              onClick={() => setEditingMonth(m.n)}
              className="text-xs h-auto py-2 flex-col gap-0.5"
            >
              <span>Month {m.n}</span>
              <span className="text-[10px] opacity-70">{packet?.submitted_at ? "Submitted" : "Draft"}</span>
            </Button>
          );
        })}
      </div>
      {editingMonth && (
        <MonthlyForm
          founderId={founderId}
          month={editingMonth}
          existing={editing}
          aiEval={aiEvals.find((a: any) => a.packet_id === editing?.id)}
          canEdit={canEdit}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function MonthlyForm({ founderId, month, existing, aiEval, canEdit, onSaved }: any) {
  const [f, setF] = useState({
    summary: existing?.summary ?? "",
    what_worked: existing?.what_worked ?? "",
    what_failed: existing?.what_failed ?? "",
    what_changed: existing?.what_changed ?? "",
    assumptions_invalidated: existing?.assumptions_invalidated ?? "",
    next_steps: existing?.next_steps ?? "",
  });
  useEffect(() => {
    setF({
      summary: existing?.summary ?? "",
      what_worked: existing?.what_worked ?? "",
      what_failed: existing?.what_failed ?? "",
      what_changed: existing?.what_changed ?? "",
      assumptions_invalidated: existing?.assumptions_invalidated ?? "",
      next_steps: existing?.next_steps ?? "",
    });
  }, [existing?.id]);
  const [saving, setSaving] = useState(false);
  const words = Object.values(f).join(" ").split(/\s+/).filter(Boolean).length;

  async function save(submit: boolean) {
    setSaving(true);
    const payload: any = { ...f, founder_id: founderId, month };
    if (submit) payload.submitted_at = new Date().toISOString();
    const { error } = existing
      ? await supabase.from("submission_packets").update(payload).eq("id", existing.id)
      : await supabase.from("submission_packets").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submit ? "Submitted to faculty" : "Saved as draft");
    onSaved();
  }

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Month {month} · {MONTHS.find((m) => m.n === month)?.label}</CardTitle>
        <span className={`text-xs ${words > 1000 ? "text-rose-600" : "text-muted-foreground"}`}>{words} / 1000 words</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Progress summary — what was attempted?" value={f.summary} onChange={(v) => setF({ ...f, summary: v })} disabled={!canEdit} />
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="What worked?" value={f.what_worked} onChange={(v) => setF({ ...f, what_worked: v })} disabled={!canEdit} />
          <Field label="What failed?" value={f.what_failed} onChange={(v) => setF({ ...f, what_failed: v })} disabled={!canEdit} />
          <Field label="What changed (pivots, scope)?" value={f.what_changed} onChange={(v) => setF({ ...f, what_changed: v })} disabled={!canEdit} />
          <Field label="Assumptions invalidated" value={f.assumptions_invalidated} onChange={(v) => setF({ ...f, assumptions_invalidated: v })} disabled={!canEdit} />
        </div>
        <Field label="What will happen next?" value={f.next_steps} onChange={(v) => setF({ ...f, next_steps: v })} disabled={!canEdit} />
        {canEdit && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save draft</Button>
            <Button size="sm" disabled={saving || words > 1000} onClick={() => save(true)}>Submit to faculty</Button>
          </div>
        )}
        {aiEval && (
          <Card className="bg-muted/40 border-border/60 shadow-none mt-3">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <CardTitle className="text-xs uppercase tracking-wider">AI Assessment (not visible to founder until faculty approves)</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div><strong>Strengths:</strong> {aiEval.strengths}</div>
              <div><strong>Weaknesses:</strong> {aiEval.weaknesses}</div>
              <div><strong>Missing:</strong> {aiEval.missing}</div>
              <div><strong>Suggested score:</strong> {aiEval.suggested_total}/100 · {aiEval.suggested_status}</div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} className="mt-1" />
    </div>
  );
}

/* ============ Weekly ============ */
function WeeklyPanel({ founderId, weekly, canEdit, onSaved }: any) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [f, setF] = useState({
    week_start: today.toISOString().slice(0, 10),
    hours_worked: 0, meetings: 0, customers_spoken: 0, features_shipped: 0,
    revenue: 0, users_acquired: 0, experiments: 0,
    failures: "", learning: "", roadblocks: "", support_needed: "",
  });
  async function save() {
    const { error } = await supabase.from("weekly_trackers").upsert({ ...f, founder_id: founderId }, { onConflict: "founder_id,week_start" });
    if (error) return toast.error(error.message);
    toast.success("Week saved"); setOpen(false); onSaved();
  }
  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen(!open)}>
            {open ? "Cancel" : "+ Log week"}
          </Button>
        </div>
      )}
      {open && canEdit && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <NumF label="Week start" type="date" value={f.week_start} onChange={(v: string) => setF({ ...f, week_start: v })} />
              <NumF label="Hours worked" value={f.hours_worked} onChange={(v: string) => setF({ ...f, hours_worked: Number(v) })} />
              <NumF label="Meetings" value={f.meetings} onChange={(v: string) => setF({ ...f, meetings: Number(v) })} />
              <NumF label="Customers spoken" value={f.customers_spoken} onChange={(v: string) => setF({ ...f, customers_spoken: Number(v) })} />
              <NumF label="Features shipped" value={f.features_shipped} onChange={(v: string) => setF({ ...f, features_shipped: Number(v) })} />
              <NumF label="Revenue ₹" value={f.revenue} onChange={(v: string) => setF({ ...f, revenue: Number(v) })} />
              <NumF label="Users acquired" value={f.users_acquired} onChange={(v: string) => setF({ ...f, users_acquired: Number(v) })} />
              <NumF label="Experiments" value={f.experiments} onChange={(v: string) => setF({ ...f, experiments: Number(v) })} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Failures" value={f.failures} onChange={(v: string) => setF({ ...f, failures: v })} />
              <Field label="Key learning" value={f.learning} onChange={(v: string) => setF({ ...f, learning: v })} />
              <Field label="Roadblocks" value={f.roadblocks} onChange={(v: string) => setF({ ...f, roadblocks: v })} />
              <Field label="Support needed" value={f.support_needed} onChange={(v: string) => setF({ ...f, support_needed: v })} />
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={save}>Save week</Button></div>
          </CardContent>
        </Card>
      )}
      {weekly.length === 0 && <Empty text="No weekly entries yet." />}
      {weekly.map((w: any) => (
        <Card key={w.id} className="border-border/70 shadow-none">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-display">{new Date(w.week_start).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">{w.hours_worked}h · {w.meetings} mtgs · {w.customers_spoken} customers</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <span>Features: {w.features_shipped}</span>
              <span>Revenue: ₹{w.revenue}</span>
              <span>Users: {w.users_acquired}</span>
              <span>Experiments: {w.experiments}</span>
            </div>
            {w.learning && <div className="text-sm mt-2"><strong>Learning:</strong> {w.learning}</div>}
            {w.roadblocks && <div className="text-sm mt-1 text-rose-700"><strong>Roadblock:</strong> {w.roadblocks}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NumF({ label, value, onChange, type = "number" }: any) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

/* ============ Evidence ============ */
function EvidencePanel({ founderId, items, canEdit, onSaved }: any) {
  const [category, setCategory] = useState<"customer"|"product"|"business"|"behavior">("customer");
  const [mode, setMode] = useState<"link"|"file">("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title) return toast.error("Title required");
    setSaving(true);
    let file_path: string | null = null;
    let mime: string | null = null;
    let size: number | null = null;
    if (mode === "file" && file) {
      const path = `${founderId}/${month || "misc"}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("evidence").upload(path, file);
      if (upErr) { setSaving(false); return toast.error(upErr.message); }
      file_path = path; mime = file.type; size = file.size;
    }
    const { error } = await supabase.from("evidence_items").insert({
      founder_id: founderId, category, kind: mode, title,
      url: mode === "link" ? url : null,
      file_path, mime, size,
      month: month ? Number(month) : null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    setTitle(""); setUrl(""); setFile(null);
    toast.success("Evidence added"); onSaved();
  }

  async function remove(item: any) {
    if (item.file_path) await supabase.storage.from("evidence").remove([item.file_path]);
    await supabase.from("evidence_items").delete().eq("id", item.id);
    onSaved();
  }

  const byCat = useMemo(() => {
    const m: any = { customer: [], product: [], business: [], behavior: [] };
    items.forEach((i: any) => m[i.category]?.push(i));
    return m;
  }, [items]);

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer Discovery</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="behavior">Founder Behaviour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kind</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.n} value={String(m.n)}>Month {m.n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
              </div>
            </div>
            {mode === "link" ? (
              <Input placeholder="https://… (Drive / Figma / GitHub / Loom / Lovable / Demo)" value={url} onChange={(e) => setUrl(e.target.value)} />
            ) : (
              <Input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.mp4,.csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            )}
            <div className="flex justify-end">
              <Button size="sm" disabled={saving} onClick={save}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving…" : "Add evidence"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(["customer","product","business","behavior"] as const).map((cat) => (
        <Card key={cat} className="border-border/70 shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{cat} ({byCat[cat].length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {byCat[cat].length === 0 && <div className="text-xs text-muted-foreground">No evidence yet.</div>}
            {byCat[cat].map((i: any) => (
              <EvidenceRow key={i.id} item={i} canEdit={canEdit} onRemove={() => remove(i)} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EvidenceRow({ item, canEdit, onRemove }: any) {
  const [signed, setSigned] = useState<string | null>(null);
  async function open() {
    if (item.kind === "link") { window.open(item.url, "_blank"); return; }
    const { data } = await supabase.storage.from("evidence").createSignedUrl(item.file_path, 600);
    if (data?.signedUrl) { setSigned(data.signedUrl); window.open(data.signedUrl, "_blank"); }
  }
  return (
    <div className="flex items-center justify-between text-sm border-b border-border/40 last:border-0 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {item.kind === "link" ? <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <button onClick={open} className="truncate hover:text-accent text-left">{item.title}</button>
        {item.month && <Badge variant="outline" className="text-[10px] border-border/70">M{item.month}</Badge>}
      </div>
      {canEdit && (
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/* ============ KPIs ============ */
function KpiPanel({ kpis, weekly }: any) {
  const totals = weekly.reduce(
    (a: any, w: any) => ({
      hours: a.hours + (w.hours_worked || 0),
      meetings: a.meetings + (w.meetings || 0),
      customers: a.customers + (w.customers_spoken || 0),
      features: a.features + (w.features_shipped || 0),
      revenue: a.revenue + Number(w.revenue || 0),
      users: a.users + (w.users_acquired || 0),
      experiments: a.experiments + (w.experiments || 0),
    }),
    { hours: 0, meetings: 0, customers: 0, features: 0, revenue: 0, users: 0, experiments: 0 },
  );
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2"><CardTitle className="text-base">Auto-computed KPIs</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total hours" value={totals.hours} />
        <Kpi label="Meetings" value={totals.meetings} />
        <Kpi label="Customers spoken" value={totals.customers} />
        <Kpi label="Features shipped" value={totals.features} />
        <Kpi label="Revenue (₹)" value={totals.revenue} />
        <Kpi label="Users acquired" value={totals.users} />
        <Kpi label="Experiments" value={totals.experiments} />
        <Kpi label="Weeks logged" value={weekly.length} />
      </CardContent>
      {kpis.length > 0 && (
        <CardContent className="border-t border-border/70 pt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Monthly snapshots</div>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr><th className="text-left">Month</th><th>Interviews</th><th>Features</th><th>Revenue</th><th>Consistency</th></tr>
            </thead>
            <tbody>
              {kpis.map((k: any) => (
                <tr key={k.id} className="border-t border-border/60">
                  <td className="py-1">{k.month}</td>
                  <td className="text-center">{k.interviews}</td>
                  <td className="text-center">{k.features_shipped}</td>
                  <td className="text-center">₹{k.revenue}</td>
                  <td className="text-center">{k.consistency_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border/60 rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-xl mt-1">{value}</div>
    </div>
  );
}

/* ============ Credits ============ */
function CreditsPanel({ credits }: any) {
  const subjects = ["subject_1", "subject_2"];
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {subjects.map((s) => {
        const c = credits.find((x: any) => x.subject === s);
        return (
          <Card key={s} className="border-border/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {s === "subject_1" ? "Entrepreneurship Practice I" : "Entrepreneurship Practice II"}
              </CardTitle>
              <div className="text-xs text-muted-foreground">6 credits</div>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div>Semester score: <strong>{c?.semester_score ?? "—"}</strong></div>
              <div>Final score: <strong>{c?.final_score ?? "—"}</strong></div>
              <div>Pass / Fail: <strong>{c?.passed == null ? "—" : c.passed ? "Pass" : "Fail"}</strong></div>
              <div>Board status: <strong>{c?.board_status ?? "—"}</strong></div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
