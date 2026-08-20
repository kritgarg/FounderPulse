import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/app/app-shell";
import { Activity, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/os/")({
  component: OsHome,
});

function OsHome() {
  const { isStaff, founderId, loading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [intakeDone, setIntakeDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const [{ data: f }, { data: a }] = await Promise.all([
        supabase.from("founders").select("id, founder_name, startup_name, campus, lifecycle_stage, lifecycle_status").order("startup_name"),
        supabase.from("academic_alerts").select("id, founder_id, kind, reason, opened_at").eq("status", "open").order("opened_at", { ascending: false }),
      ]);
      setRows(f ?? []);
      setAlerts(a ?? []);
    })();
  }, [isStaff]);

  useEffect(() => {
    if (!founderId || isStaff) { setIntakeDone(null); return; }
    (async () => {
      const { data } = await supabase.from("founders")
        .select("intake_completed_at").eq("id", founderId).maybeSingle();
      setIntakeDone(!!(data as any)?.intake_completed_at);
    })();
  }, [founderId, isStaff]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  // Student flow
  if (founderId && !isStaff) {
    if (intakeDone === null) return <div className="text-muted-foreground">Loading…</div>;
    if (!intakeDone) return <Navigate to="/os/onboarding" replace />;
    return <Navigate to="/os/biweekly" replace />;
  }

  if (!isStaff && !founderId) {
    return (
      <Card className="border-border/70 shadow-none">
        <CardContent className="pt-8 pb-8 text-center space-y-2">
          <div className="font-display text-xl">No startup linked to your account</div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ask the program lead to link your account to your founder profile. Once linked, your workspace
            will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const byStatus = rows.reduce(
    (acc: any, r) => ((acc[r.lifecycle_status] = (acc[r.lifecycle_status] || 0) + 1), acc),
    {},
  );

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Founders" value={rows.length} icon={<Activity className="h-3.5 w-3.5" />} />
        <Stat label="Active" value={byStatus.active ?? 0} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <Stat label="Paused / Pivoted" value={(byStatus.paused ?? 0) + (byStatus.pivoted ?? 0)} />
        <Stat label="Open alerts" value={alerts.length} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/40 shadow-none">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-700 mb-2">Open Academic Alerts</div>
            <ul className="space-y-1.5 text-sm">
              {alerts.slice(0, 8).map((a) => {
                const founder = rows.find((r) => r.id === a.founder_id);
                return (
                  <li key={a.id}>
                    <Link to="/os/workspace/$founderId" params={{ founderId: a.founder_id }} className="hover:underline">
                      {founder?.startup_name ?? "—"}
                    </Link>{" "}
                    · <span className="text-muted-foreground">{a.reason}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Startup</th>
                <th className="text-left px-5 py-3 font-medium">Founder</th>
                <th className="text-left px-5 py-3 font-medium">Stage</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Campus</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Link to="/os/workspace/$founderId" params={{ founderId: r.id }} className="font-display font-medium hover:text-accent">
                      {r.startup_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{r.founder_name}</td>
                  <td className="px-5 py-3"><Pill>{r.lifecycle_stage}</Pill></td>
                  <td className="px-5 py-3"><Pill tone={r.lifecycle_status === "active" ? "ok" : "muted"}>{r.lifecycle_status}</Pill></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{r.campus ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground p-8">No founders yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="font-display text-3xl mt-1.5 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "ok" | "muted" }) {
  const cls = tone === "ok" ? "bg-status-green/15 text-status-green" : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${cls}`}>{children}</span>;
}
