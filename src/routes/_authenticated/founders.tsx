import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Download, Search } from "lucide-react";
import { StatusBadge } from "@/components/app/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/founders")({
  component: FoundersList,
});

const STAGES = ["idea","validation","mvp","pilot","revenue","scale"] as const;

type FounderRow = {
  id: string; founder_name: string; startup_name: string; campus: string|null;
  stage: string; industry: string|null; team_size: number|null;
  latest_status?: string|null; latest_score?: number|null;
};

function FoundersList() {
  const { isStaff } = useAuth();
  const [rows, setRows] = useState<FounderRow[]>([]);
  const [q, setQ] = useState("");
  const [campusFilter, setCampusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    const { data: founders } = await supabase.from("founders").select("*").order("created_at", { ascending: false });
    const { data: evals } = await supabase.from("evaluations").select("founder_id, total_score, status, created_at").order("created_at", { ascending: false });
    const latest = new Map<string, any>();
    evals?.forEach((e) => { if (!latest.has(e.founder_id)) latest.set(e.founder_id, e); });
    setRows((founders ?? []).map((f) => ({ ...f, latest_status: latest.get(f.id)?.status ?? null, latest_score: latest.get(f.id)?.total_score ?? null })));
  };

  useEffect(() => { load(); }, []);

  const campuses = useMemo(() => Array.from(new Set(rows.map(r => r.campus).filter(Boolean))) as string[], [rows]);

  const filtered = rows.filter((r) => {
    if (q && !`${r.founder_name} ${r.startup_name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (campusFilter !== "all" && r.campus !== campusFilter) return false;
    if (stageFilter !== "all" && r.stage !== stageFilter) return false;
    if (statusFilter !== "all" && (r.latest_status ?? "none") !== statusFilter) return false;
    return true;
  });

  function exportCSV() {
    const headers = ["Founder","Startup","Campus","Stage","Industry","Team","Latest Score","Status"];
    const lines = [headers.join(",")].concat(filtered.map(r =>
      [r.founder_name, r.startup_name, r.campus ?? "", r.stage, r.industry ?? "", r.team_size ?? "", r.latest_score ?? "", r.latest_status ?? ""].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")
    ));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "founders.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4 pb-2 border-b border-border/70">
        <div className="space-y-2">
          <div className="text-[10.5px] uppercase tracking-[0.25em] text-muted-foreground">Portfolio</div>
          <h1 className="font-display text-4xl leading-[1.02] tracking-tight">
            Founders <span className="italic text-accent">in residence</span>.
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {rows.length} founders shown
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="border-border/80">
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          {isStaff && <NewFounderDialog onCreated={load} />}
        </div>
      </header>

      <Card className="border-border/70 shadow-none">
        <CardContent className="pt-5">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 bg-background" placeholder="Search name or startup" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={campusFilter} onValueChange={setCampusFilter}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Campus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campuses</SelectItem>
                {campuses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="green">On Track</SelectItem>
                <SelectItem value="yellow">Watch</SelectItem>
                <SelectItem value="red">At Risk</SelectItem>
                <SelectItem value="none">No reviews yet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Founder</th>
                  <th className="text-left px-5 py-3 font-medium">Startup</th>
                  <th className="text-left px-5 py-3 font-medium">Campus</th>
                  <th className="text-left px-5 py-3 font-medium">Stage</th>
                  <th className="text-left px-5 py-3 font-medium">Team</th>
                  <th className="text-right px-5 py-3 font-medium">Score</th>
                  <th className="text-left px-5 py-3 font-medium pl-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No founders match these filters.</td></tr>}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to="/founders/$id" params={{ id: r.id }} className="font-display font-medium text-[15px] hover:text-accent transition-colors">
                        {r.founder_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-foreground/80">{r.startup_name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{r.campus ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] uppercase tracking-wider border border-border/80 px-1.5 py-0.5 rounded">{r.stage}</span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.team_size ?? "—"}</td>
                    <td className="px-5 py-3.5 font-mono tabular text-right">{r.latest_score ?? "—"}</td>
                    <td className="px-5 py-3.5 pl-6"><StatusBadge status={r.latest_status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewFounderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ founder_name: "", startup_name: "", campus: "", batch: "", semester: "", industry: "", team_size: 1, stage: "idea" as typeof STAGES[number] });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.from("founders").insert(form).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Founder added");
    setOpen(false);
    onCreated();
    if (data) navigate({ to: "/founders/$id", params: { id: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Founder</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Founder</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Founder Name" required value={form.founder_name} onChange={(v) => setForm({...form, founder_name: v})} />
          <Field label="Startup Name" required value={form.startup_name} onChange={(v) => setForm({...form, startup_name: v})} />
          <Field label="Campus" value={form.campus} onChange={(v) => setForm({...form, campus: v})} />
          <Field label="Batch" value={form.batch} onChange={(v) => setForm({...form, batch: v})} />
          <Field label="Semester" value={form.semester} onChange={(v) => setForm({...form, semester: v})} />
          <Field label="Industry" value={form.industry} onChange={(v) => setForm({...form, industry: v})} />
          <Field label="Team Size" type="number" value={String(form.team_size)} onChange={(v) => setForm({...form, team_size: Number(v)||1})} />
          <div>
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={(v: any) => setForm({...form, stage: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter className="col-span-2"><Button disabled={saving}>{saving ? "Saving..." : "Create"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type="text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
