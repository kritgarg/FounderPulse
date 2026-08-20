import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/committees")({
  component: Committees,
});

const LEVELS = ["founder_self", "ai", "faculty", "mentor", "board"] as const;

function Committees() {
  const { isStaff, isAdmin } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [founders, setFounders] = useState<any[]>([]);
  const [f, setF] = useState({ founder_id: "", level: "mentor" as typeof LEVELS[number], reviewer_name: "", organisation: "", score: 0, month: 1, notes: "" });

  const load = async () => {
    const [{ data: c }, { data: fs }] = await Promise.all([
      supabase.from("committee_scores").select("*").order("created_at", { ascending: false }),
      supabase.from("founders").select("id, founder_name, startup_name"),
    ]);
    setRows(c ?? []); setFounders(fs ?? []);
  };
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.founder_id) return toast.error("Founder required");
    const { error } = await supabase.from("committee_scores").insert(f);
    if (error) return toast.error(error.message);
    setF({ founder_id: "", level: "mentor", reviewer_name: "", organisation: "", score: 0, month: 1, notes: "" });
    toast.success("Score recorded"); load();
  }

  if (!isStaff) return <div className="text-muted-foreground">Staff access only.</div>;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Record committee / external review</div>
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Founder</Label>
                <Select value={f.founder_id} onValueChange={(v) => setF({ ...f, founder_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{founders.map((x) => <SelectItem key={x.id} value={x.id}>{x.startup_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Level</Label>
                <Select value={f.level} onValueChange={(v: any) => setF({ ...f, level: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <FieldL label="Reviewer name" value={f.reviewer_name} onChange={(v) => setF({ ...f, reviewer_name: v })} />
              <FieldL label="Organisation" value={f.organisation} onChange={(v) => setF({ ...f, organisation: v })} />
              <FieldL label="Score" type="number" value={String(f.score)} onChange={(v) => setF({ ...f, score: Number(v) })} />
              <FieldL label="Month" type="number" value={String(f.month)} onChange={(v) => setF({ ...f, month: Number(v) })} />
            </div>
            <Textarea placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            <div className="flex justify-end"><Button size="sm" onClick={add}>+ Record</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Startup</th>
                <th className="text-left px-5 py-3 font-medium">Level</th>
                <th className="text-left px-5 py-3 font-medium">Reviewer</th>
                <th className="text-left px-5 py-3 font-medium">Org</th>
                <th className="text-right px-5 py-3 font-medium">Score</th>
                <th className="text-left px-5 py-3 font-medium pl-6">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-8">No committee scores yet.</td></tr>}
              {rows.map((r) => {
                const fr = founders.find((x) => x.id === r.founder_id);
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-5 py-3">{fr?.startup_name ?? "—"}</td>
                    <td className="px-5 py-3"><Badge variant="outline" className="capitalize border-border/70">{r.level.replace("_"," ")}</Badge></td>
                    <td className="px-5 py-3">{r.reviewer_name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.organisation ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-mono">{r.score ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground pl-6">{r.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldL({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
