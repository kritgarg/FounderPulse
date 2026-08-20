import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/simulations")({
  component: Sims,
});

function Sims() {
  const { isStaff, isAdmin, founderId } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [founders, setFounders] = useState<any[]>([]);
  const [f, setF] = useState({ founder_id: "", name: "", score: 0, rank: 0, status: "completed", faculty_comments: "", evidence_url: "" });

  const load = async () => {
    const [{ data: s }, { data: fs }] = await Promise.all([
      supabase.from("simulations").select("*").order("created_at", { ascending: false }),
      supabase.from("founders").select("id, founder_name, startup_name"),
    ]);
    setRows(s ?? []); setFounders(fs ?? []);
  };
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.founder_id || !f.name) return toast.error("Founder and name required");
    const { error } = await supabase.from("simulations").insert({
      founder_id: f.founder_id, name: f.name,
      score: f.score || null, rank: f.rank || null, status: f.status,
      faculty_comments: f.faculty_comments || null, evidence_url: f.evidence_url || null,
    });
    if (error) return toast.error(error.message);
    setF({ founder_id: "", name: "", score: 0, rank: 0, status: "completed", faculty_comments: "", evidence_url: "" });
    toast.success("Saved"); load();
  }

  const visible = isStaff ? rows : rows.filter((r) => r.founder_id === founderId);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Log simulation result</div>
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Founder</Label>
                <Select value={f.founder_id} onValueChange={(v) => setF({ ...f, founder_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{founders.map((x) => <SelectItem key={x.id} value={x.id}>{x.startup_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Simulation name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
              <Field label="Score" type="number" value={String(f.score)} onChange={(v) => setF({ ...f, score: Number(v) })} />
              <Field label="Rank" type="number" value={String(f.rank)} onChange={(v) => setF({ ...f, rank: Number(v) })} />
              <Field label="Faculty comments" value={f.faculty_comments} onChange={(v) => setF({ ...f, faculty_comments: v })} />
              <Field label="Evidence URL" value={f.evidence_url} onChange={(v) => setF({ ...f, evidence_url: v })} />
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={add}>+ Add</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Founder</th>
                <th className="text-left px-5 py-3 font-medium">Simulation</th>
                <th className="text-left px-5 py-3 font-medium">Score</th>
                <th className="text-left px-5 py-3 font-medium">Rank</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Comments</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-8">No simulations recorded.</td></tr>}
              {visible.map((r) => {
                const fr = founders.find((x) => x.id === r.founder_id);
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-5 py-3">{fr?.startup_name ?? "—"}</td>
                    <td className="px-5 py-3">{r.name}</td>
                    <td className="px-5 py-3 font-mono">{r.score ?? "—"}</td>
                    <td className="px-5 py-3 font-mono">{r.rank ?? "—"}</td>
                    <td className="px-5 py-3 capitalize">{r.status ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{r.faculty_comments ?? "—"}</td>
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

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
