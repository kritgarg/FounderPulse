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

export const Route = createFileRoute("/_authenticated/os/events")({
  component: Events,
});

const ROLES = ["attendee", "presenter", "winner", "volunteer"] as const;

function Events() {
  const { isAdmin, isStaff, founderId } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [founders, setFounders] = useState<any[]>([]);
  const [eform, setEform] = useState({ name: "", date: "", description: "" });
  const [pform, setPform] = useState<{ event_id: string; founder_id: string; role: typeof ROLES[number]; evidence_url: string }>({
    event_id: "", founder_id: "", role: "attendee", evidence_url: "",
  });

  const load = async () => {
    const [{ data: e }, { data: p }, { data: f }] = await Promise.all([
      supabase.from("events").select("*").order("date", { ascending: false }),
      supabase.from("event_participations").select("*").order("created_at", { ascending: false }),
      supabase.from("founders").select("id, founder_name, startup_name"),
    ]);
    setEvents(e ?? []); setParts(p ?? []); setFounders(f ?? []);
  };
  useEffect(() => { load(); }, []);

  async function addEvent() {
    if (!eform.name) return toast.error("Event name required");
    const payload: any = { name: eform.name, description: eform.description };
    if (eform.date) payload.date = eform.date;
    const { error } = await supabase.from("events").insert(payload);
    if (error) return toast.error(error.message);
    setEform({ name: "", date: "", description: "" }); toast.success("Event added"); load();
  }
  async function addPart() {
    const fid = founderId && !isStaff ? founderId : pform.founder_id;
    if (!pform.event_id || !fid) return toast.error("Event and founder required");
    const { error } = await supabase.from("event_participations").insert({
      event_id: pform.event_id, founder_id: fid, role: pform.role, evidence_url: pform.evidence_url || null,
    });
    if (error) return toast.error(error.message);
    setPform({ event_id: "", founder_id: "", role: "attendee", evidence_url: "" });
    toast.success("Participation logged"); load();
  }
  async function approve(id: string) {
    await supabase.from("event_participations").update({ faculty_approved: true } as any).eq("id", id);
    load();
  }

  const visibleParts = isStaff ? parts : parts.filter((p) => p.founder_id === founderId);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Add event</div>
            <div className="grid md:grid-cols-3 gap-3">
              <FieldL label="Name" value={eform.name} onChange={(v) => setEform({ ...eform, name: v })} />
              <FieldL label="Date" type="date" value={eform.date} onChange={(v) => setEform({ ...eform, date: v })} />
              <FieldL label="Description" value={eform.description} onChange={(v) => setEform({ ...eform, description: v })} />
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={addEvent}>+ Event</Button></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-none">
        <CardContent className="pt-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Log participation</div>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Event</Label>
              <Select value={pform.event_id} onValueChange={(v) => setPform({ ...pform, event_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isStaff && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Founder</Label>
                <Select value={pform.founder_id} onValueChange={(v) => setPform({ ...pform, founder_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{founders.map((f) => <SelectItem key={f.id} value={f.id}>{f.founder_name} — {f.startup_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
              <Select value={pform.role} onValueChange={(v: any) => setPform({ ...pform, role: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <FieldL label="Evidence URL" value={pform.evidence_url} onChange={(v) => setPform({ ...pform, evidence_url: v })} />
          </div>
          <div className="flex justify-end"><Button size="sm" onClick={addPart}>+ Log</Button></div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Event</th>
                <th className="text-left px-5 py-3 font-medium">Founder</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Evidence</th>
                <th className="text-left px-5 py-3 font-medium">Approval</th>
              </tr>
            </thead>
            <tbody>
              {visibleParts.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground p-8">No participation yet.</td></tr>}
              {visibleParts.map((p) => {
                const e = events.find((x) => x.id === p.event_id);
                const f = founders.find((x) => x.id === p.founder_id);
                return (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-5 py-3 font-medium">{e?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{f?.startup_name ?? "—"}</td>
                    <td className="px-5 py-3 capitalize">{p.role}</td>
                    <td className="px-5 py-3">
                      {p.evidence_url ? <a className="text-accent hover:underline text-xs" href={p.evidence_url} target="_blank" rel="noreferrer">link</a> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {p.faculty_approved
                        ? <Badge className="bg-status-green/15 text-status-green border-0">Approved</Badge>
                        : isAdmin
                          ? <Button size="sm" variant="ghost" className="h-7" onClick={() => approve(p.id)}>Approve</Button>
                          : <Badge variant="outline" className="border-border/70 text-muted-foreground">Pending</Badge>}
                    </td>
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
