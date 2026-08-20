import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BrainCog, Plus, Trash2, Save, Sparkles, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { updateMentorKpiGoals, listKpiEditAudit } from "@/lib/meeting-transcripts.functions";

export const Route = createFileRoute("/_authenticated/os/mentor-review")({
  component: MentorReview,
});

type Kpi = { name: string; target: string; timeframe: string; current?: string };
type Goal = { title: string; due_by?: string; success_criteria: string };
type Risk = { description: string; severity: "low" | "medium" | "high" };
type Action = { owner: "founder" | "mentor"; task: string; due_by?: string };

function asArr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : []; }

function MentorReview() {
  const { isStaff, isMentor, loading } = useAuth();
  const canUse = isStaff || isMentor;

  const [founders, setFounders] = useState<any[]>([]);
  const [founderId, setFounderId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const runUpdate = useServerFn(updateMentorKpiGoals);

  useEffect(() => {
    supabase.from("founders").select("id, startup_name").order("startup_name")
      .then(({ data }) => setFounders(data ?? []));
  }, []);

  useEffect(() => {
    if (!founderId) { setRows([]); setSelectedId(""); return; }
    supabase.from("mentor_kpi_goals")
      .select("*, biweekly_meetings(cycle_number, meeting_date)")
      .eq("founder_id", founderId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows(data ?? []);
        setSelectedId((data && data[0]?.id) ?? "");
      });
  }, [founderId]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!canUse) return <Navigate to="/os" replace />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <BrainCog className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Mentor review</div>
          <div className="font-display text-2xl tracking-tight">Verify AI-extracted KPIs & goals</div>
          <p className="text-xs text-muted-foreground mt-0.5">Edit anything wrong, then save. Founder sees the corrected version.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <Card className="border-border/70 shadow-none h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-[0.18em]">Pick a transcript</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={founderId} onValueChange={setFounderId}>
              <SelectTrigger><SelectValue placeholder="Founder" /></SelectTrigger>
              <SelectContent>
                {founders.map((f) => <SelectItem key={f.id} value={f.id}>{f.startup_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              {rows.length === 0 && founderId && <div className="text-xs text-muted-foreground">No extractions yet.</div>}
              {rows.map((r) => {
                const cyc = r.biweekly_meetings?.cycle_number;
                const date = r.biweekly_meetings?.meeting_date;
                return (
                  <button key={r.id} onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left rounded-md border px-2.5 py-2 text-xs ${
                      selectedId === r.id ? "border-foreground bg-muted/60" : "border-border/60 hover:bg-muted/40"
                    }`}>
                    <div className="font-medium">Cycle {cyc ?? "?"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {date ? new Date(date).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
                      {r.mentor_sentiment && <> · {r.mentor_sentiment}</>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <EditPane key={selected.id} row={selected} onSave={async (patch) => {
              try {
                await runUpdate({ data: { id: selected.id, ...patch } });
                toast.success("Saved");
                setRows((rs) => rs.map((r) => r.id === selected.id ? { ...r, ...patch } : r));
              } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
            }} />
            <AuditTrail kpiGoalId={selected.id} />
          </div>
        ) : (
          <Card className="border-border/70 shadow-none">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Select a founder to see their AI-extracted meeting insights.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AuditTrail({ kpiGoalId }: { kpiGoalId: string }) {
  const runList = useServerFn(listKpiEditAudit);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameById, setNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    runList({ data: { kpiGoalId } })
      .then(async (res: any) => {
        if (cancelled) return;
        const list = (res?.rows ?? []) as any[];
        setRows(list);
        const ids = Array.from(new Set(list.map((r) => r.edited_by).filter(Boolean)));
        if (ids.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
          setNameById(Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || p.email || p.id])));
        }
      })
      .catch(() => setRows([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [kpiGoalId]);

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2 flex-row items-center gap-2">
        <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <CardTitle className="text-sm uppercase tracking-[0.18em]">Verification audit trail</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground">No edits yet. The AI draft above is unchanged.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <details key={r.id} className="text-xs border border-border/60 rounded-md">
                <summary className="cursor-pointer px-3 py-2 flex items-center justify-between">
                  <div>
                    <span className="font-medium capitalize">{String(r.field).replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground"> · edited by {nameById[r.edited_by] ?? "someone"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </summary>
                <div className="grid md:grid-cols-2 gap-2 px-3 pb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Before</div>
                    <pre className="text-[10.5px] bg-muted/40 p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(r.before_value, null, 2)}</pre>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">After</div>
                    <pre className="text-[10.5px] bg-emerald-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(r.after_value, null, 2)}</pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function EditPane({ row, onSave }: { row: any; onSave: (p: any) => Promise<void> }) {
  const [kpis, setKpis] = useState<Kpi[]>(asArr<Kpi>(row.kpis));
  const [goals, setGoals] = useState<Goal[]>(asArr<Goal>(row.goals));
  const [risks, setRisks] = useState<Risk[]>(asArr<Risk>(row.risks));
  const [actions, setActions] = useState<Action[]>(asArr<Action>(row.action_items));
  const [sentiment, setSentiment] = useState<string>(row.mentor_sentiment ?? "neutral");
  const [focus, setFocus] = useState<string>(row.next_review_focus ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ kpis, goals, risks, action_items: actions, mentor_sentiment: sentiment, next_review_focus: focus });
    setSaving(false);
  }

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm uppercase tracking-[0.18em]">Extraction</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1"><Sparkles className="h-2.5 w-2.5" /> AI draft</Badge>
          <Button size="sm" disabled={saving} onClick={save}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving…" : "Save verified"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <Section title="KPIs" onAdd={() => setKpis([...kpis, { name: "", target: "", timeframe: "", current: "" }])}>
          {kpis.map((k, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input className="col-span-3" placeholder="Name" value={k.name}
                onChange={(e) => setKpis(kpis.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <Input className="col-span-3" placeholder="Target" value={k.target}
                onChange={(e) => setKpis(kpis.map((x, j) => j === i ? { ...x, target: e.target.value } : x))} />
              <Input className="col-span-2" placeholder="Timeframe" value={k.timeframe}
                onChange={(e) => setKpis(kpis.map((x, j) => j === i ? { ...x, timeframe: e.target.value } : x))} />
              <Input className="col-span-3" placeholder="Current" value={k.current ?? ""}
                onChange={(e) => setKpis(kpis.map((x, j) => j === i ? { ...x, current: e.target.value } : x))} />
              <Button variant="ghost" size="icon" className="col-span-1 h-9"
                onClick={() => setKpis(kpis.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Section>

        {/* Goals */}
        <Section title="Goals" onAdd={() => setGoals([...goals, { title: "", due_by: "", success_criteria: "" }])}>
          {goals.map((g, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input className="col-span-4" placeholder="Title" value={g.title}
                onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <Input className="col-span-2" type="date" value={g.due_by ?? ""}
                onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, due_by: e.target.value } : x))} />
              <Input className="col-span-5" placeholder="Success criteria" value={g.success_criteria}
                onChange={(e) => setGoals(goals.map((x, j) => j === i ? { ...x, success_criteria: e.target.value } : x))} />
              <Button variant="ghost" size="icon" className="col-span-1 h-9"
                onClick={() => setGoals(goals.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Section>

        {/* Risks */}
        <Section title="Risks" onAdd={() => setRisks([...risks, { description: "", severity: "medium" }])}>
          {risks.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input className="col-span-9" placeholder="Description" value={r.description}
                onChange={(e) => setRisks(risks.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              <Select value={r.severity} onValueChange={(v) => setRisks(risks.map((x, j) => j === i ? { ...x, severity: v as any } : x))}>
                <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="col-span-1 h-9"
                onClick={() => setRisks(risks.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Section>

        {/* Action items */}
        <Section title="Action items" onAdd={() => setActions([...actions, { owner: "founder", task: "", due_by: "" }])}>
          {actions.map((a, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Select value={a.owner} onValueChange={(v) => setActions(actions.map((x, j) => j === i ? { ...x, owner: v as any } : x))}>
                <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="founder">founder</SelectItem>
                  <SelectItem value="mentor">mentor</SelectItem>
                </SelectContent>
              </Select>
              <Input className="col-span-7" placeholder="Task" value={a.task}
                onChange={(e) => setActions(actions.map((x, j) => j === i ? { ...x, task: e.target.value } : x))} />
              <Input className="col-span-2" type="date" value={a.due_by ?? ""}
                onChange={(e) => setActions(actions.map((x, j) => j === i ? { ...x, due_by: e.target.value } : x))} />
              <Button variant="ghost" size="icon" className="col-span-1 h-9"
                onClick={() => setActions(actions.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Section>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mentor sentiment</Label>
            <Select value={sentiment} onValueChange={setSentiment}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["supportive","cautious","concerned","excited","neutral"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Next review focus</Label>
            <Textarea value={focus} onChange={(e) => setFocus(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
        <Button variant="outline" size="sm" onClick={onAdd}><Plus className="h-3 w-3 mr-1" /> Add</Button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
