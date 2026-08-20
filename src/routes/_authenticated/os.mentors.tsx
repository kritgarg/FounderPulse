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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/mentors")({
  component: Mentors,
});

function Mentors() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [founders, setFounders] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", domain: "", email: "", organisation: "", availability: "", notes: "" });

  const load = async () => {
    const [{ data: m }, { data: f }] = await Promise.all([
      supabase.from("mentors").select("*").order("name"),
      supabase.from("founders").select("id, startup_name, founder_name, mentor_id"),
    ]);
    setRows(m ?? []); setFounders(f ?? []);
  };
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.name) return toast.error("Name required");
    const { error } = await supabase.from("mentors").insert(form);
    if (error) return toast.error(error.message);
    setForm({ name: "", domain: "", email: "", organisation: "", availability: "", notes: "" });
    toast.success("Mentor added"); load();
  }

  async function assign(founderId: string, mentorId: string) {
    const { error } = await supabase.from("founders").update({ mentor_id: mentorId === "none" ? null : mentorId } as any).eq("id", founderId);
    if (error) return toast.error(error.message);
    toast.success("Assignment updated"); load();
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Add mentor</div>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Domain" value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Organisation" value={form.organisation} onChange={(v) => setForm({ ...form, organisation: v })} />
              <Field label="Availability" value={form.availability} onChange={(v) => setForm({ ...form, availability: v })} />
            </div>
            <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex justify-end"><Button size="sm" onClick={add}>+ Add mentor</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Mentor</th>
                <th className="text-left px-5 py-3 font-medium">Domain</th>
                <th className="text-left px-5 py-3 font-medium">Organisation</th>
                <th className="text-left px-5 py-3 font-medium">Assigned founders</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="text-center text-muted-foreground p-8">No mentors yet.</td></tr>}
              {rows.map((m) => {
                const assigned = founders.filter((f) => f.mentor_id === m.id);
                return (
                  <tr key={m.id} className="border-t border-border/60 align-top">
                    <td className="px-5 py-3 font-display">{m.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{m.domain ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{m.organisation ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{assigned.map((a: any) => a.startup_name).join(", ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Assign mentors to startups</div>
            <div className="space-y-2">
              {founders.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 border-b border-border/40 py-2">
                  <div className="text-sm flex-1">
                    <div className="font-medium">{f.startup_name}</div>
                    <div className="text-xs text-muted-foreground">{f.founder_name}</div>
                  </div>
                  <Select value={f.mentor_id ?? "none"} onValueChange={(v) => assign(f.id, v)}>
                    <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {rows.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
