import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const ROLES = ["super_admin", "leadership", "faculty", "mentor", "student"] as const;

function AdminPage() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [founders, setFounders] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    const [{ data: p }, { data: ur }, { data: f }, { data: ma }, { data: fr }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("founders").select("id, founder_name, startup_name"),
      supabase.from("mentor_assignments").select("*"),
      supabase.from("faculty_signup_requests" as any).select("*").order("requested_at", { ascending: false }),
    ]);
    setProfiles(p ?? []); setFounders(f ?? []); setAssignments(ma ?? []);
    setRequests((fr as any) ?? []);
    const map: Record<string, string[]> = {};
    ur?.forEach(r => { (map[r.user_id] ??= []).push(r.role); });
    setRoles(map);
  };
  useEffect(() => { load(); }, []);

  async function approveFaculty(req: any) {
    const { error: e1 } = await supabase.from("user_roles").insert({ user_id: req.user_id, role: "faculty" as any });
    if (e1 && !e1.message.includes("duplicate")) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("faculty_signup_requests" as any)
      .update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", req.id);
    if (e2) return toast.error(e2.message);
    toast.success(`Approved ${req.email}`); load();
  }
  async function rejectFaculty(req: any) {
    const { error } = await supabase.from("faculty_signup_requests" as any)
      .update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", req.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected"); load();
  }

  async function addRole(userId: string, role: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) return toast.error(error.message);
    toast.success("Role added"); load();
  }
  async function removeRole(userId: string, role: string) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) return toast.error(error.message);
    load();
  }
  async function assignMentor(mentorId: string, founderId: string) {
    const { error } = await supabase.from("mentor_assignments").insert({ mentor_id: mentorId, founder_id: founderId });
    if (error) return toast.error(error.message);
    toast.success("Assigned"); load();
  }

  if (!isAdmin) return <div className="text-muted-foreground">Super admin access only.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & Users</h1>
          <p className="text-sm text-muted-foreground">Manage who can evaluate, mentor, or submit.</p>
        </div>
        <Link to="/admin/baseline">
          <Button variant="outline" size="sm">
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> Baseline review & audit log
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faculty access requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Requested</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No requests.</td></tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2">{r.full_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(r.requested_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-[10px] uppercase rounded ${r.status === "pending" ? "bg-amber-100 text-amber-800" : r.status === "approved" ? "bg-status-green/15 text-status-green" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveFaculty(r)}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => rejectFaculty(r)}>Reject</Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Users</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Roles</th><th className="text-left px-4 py-2">Add Role</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{p.full_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(roles[p.id] ?? []).map(r => (
                        <button key={r} onClick={() => removeRole(p.id, r)} className="px-2 py-0.5 text-xs bg-secondary rounded hover:bg-destructive hover:text-destructive-foreground">{r} ×</button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Select onValueChange={(v) => addRole(p.id, v)}>
                      <SelectTrigger className="w-40"><SelectValue placeholder="Add role" /></SelectTrigger>
                      <SelectContent>{ROLES.filter(r => !(roles[p.id] ?? []).includes(r)).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Link student logins to startups</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Each student account must be linked to their founder record so they only see their own startup in Venture OS.
          </p>
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.full_name || p.email}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
              <Select
                value={(p as any).founder_id ?? "none"}
                onValueChange={async (v) => {
                  const { error } = await supabase.from("profiles").update({ founder_id: v === "none" ? null : v } as any).eq("id", p.id);
                  if (error) return toast.error(error.message);
                  toast.success("Linked"); load();
                }}
              >
                <SelectTrigger className="w-72 h-8 text-xs"><SelectValue placeholder="Unlinked (staff)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unlinked (staff)</SelectItem>
                  {founders.map((f) => <SelectItem key={f.id} value={f.id}>{f.founder_name} — {f.startup_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mentor Assignments</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <AssignmentForm profiles={profiles} roles={roles} founders={founders} onAssign={assignMentor} />
          <div className="text-xs text-muted-foreground">{assignments.length} active assignments</div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignmentForm({ profiles, roles, founders, onAssign }: any) {
  const [mentorId, setMentorId] = useState("");
  const [founderId, setFounderId] = useState("");
  const mentors = profiles.filter((p: any) => (roles[p.id] ?? []).includes("mentor"));
  return (
    <div className="flex gap-2 flex-wrap">
      <Select value={mentorId} onValueChange={setMentorId}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Mentor" /></SelectTrigger>
        <SelectContent>{mentors.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={founderId} onValueChange={setFounderId}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Founder" /></SelectTrigger>
        <SelectContent>{founders.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.founder_name} — {f.startup_name}</SelectItem>)}</SelectContent>
      </Select>
      <Button size="sm" disabled={!mentorId || !founderId} onClick={() => { onAssign(mentorId, founderId); setMentorId(""); setFounderId(""); }}>Assign</Button>
    </div>
  );
}
