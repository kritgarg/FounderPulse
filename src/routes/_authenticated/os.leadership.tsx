import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Award, DollarSign, Users, AlertCircle, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/os/leadership")({
  component: Leadership,
});

function Leadership() {
  const { isLeadership } = useAuth();
  const [founders, setFounders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!isLeadership) return;
    (async () => {
      const [f, r, w, a, e] = await Promise.all([
        supabase.from("founders").select("*"),
        supabase.from("faculty_reviews").select("*").eq("decision", "approve"),
        supabase.from("weekly_trackers").select("*"),
        supabase.from("academic_alerts").select("*").eq("status", "open"),
        supabase.from("event_participations").select("*"),
      ]);
      setFounders(f.data ?? []); setReviews(r.data ?? []); setWeekly(w.data ?? []);
      setAlerts(a.data ?? []); setEvents(e.data ?? []);
    })();
  }, [isLeadership]);

  if (!isLeadership) return <div className="text-muted-foreground">Leadership access only.</div>;

  // metrics
  const totalRevenue = weekly.reduce((s, w) => s + Number(w.revenue || 0), 0);
  const customersInterviewed = weekly.reduce((s, w) => s + (w.customers_spoken || 0), 0);
  const featuresShipped = weekly.reduce((s, w) => s + (w.features_shipped || 0), 0);

  const latestByFounder = new Map<string, any>();
  reviews.sort((a, b) => new Date(b.decided_at ?? b.created_at).getTime() - new Date(a.decided_at ?? a.created_at).getTime());
  reviews.forEach((r) => { if (!latestByFounder.has(r.founder_id)) latestByFounder.set(r.founder_id, r); });
  const trafficCounts = { green: 0, yellow: 0, red: 0 };
  latestByFounder.forEach((r) => trafficCounts[r.status as "green"|"yellow"|"red"] = (trafficCounts[r.status as "green"|"yellow"|"red"] ?? 0) + 1);

  const byStatus = founders.reduce((acc: any, f) => ((acc[f.lifecycle_status] = (acc[f.lifecycle_status] || 0) + 1), acc), {});
  const byCampus = founders.reduce((acc: any, f) => ((acc[f.campus ?? "—"] = (acc[f.campus ?? "—"] || 0) + 1), acc), {});

  const topPerformers = Array.from(latestByFounder.entries())
    .sort((a, b) => b[1].total_score - a[1].total_score)
    .slice(0, 5)
    .map(([fid, rev]) => ({ founder: founders.find((f) => f.id === fid), score: rev.total_score }));

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.25em] text-muted-foreground">Leadership view</div>
        <h1 className="font-display text-4xl tracking-tight">Cohort health <span className="italic text-accent">at a glance</span>.</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<Activity className="h-4 w-4" />} label="Total startups" value={founders.length} />
        <KPI icon={<Users className="h-4 w-4" />} label="Active" value={byStatus.active ?? 0} />
        <KPI icon={<DollarSign className="h-4 w-4" />} label="Revenue ₹" value={totalRevenue.toLocaleString("en-IN")} />
        <KPI icon={<AlertCircle className="h-4 w-4" />} label="Open alerts" value={alerts.length} />
        <KPI icon={<Award className="h-4 w-4" />} label="Customers interviewed" value={customersInterviewed} />
        <KPI label="Features shipped" value={featuresShipped} />
        <KPI label="Event participations" value={events.length} />
        <KPI label="Paused / Closed" value={(byStatus.paused ?? 0) + (byStatus.closed ?? 0)} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Traffic light distribution</div>
            <div className="space-y-2">
              <Bar label="Green" value={trafficCounts.green} total={founders.length} tone="green" />
              <Bar label="Yellow" value={trafficCounts.yellow} total={founders.length} tone="yellow" />
              <Bar label="Red" value={trafficCounts.red} total={founders.length} tone="red" />
              <Bar label="No review" value={founders.length - latestByFounder.size} total={founders.length} tone="muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Campus comparison</div>
            <div className="space-y-2">
              {Object.entries(byCampus).map(([c, n]) => (
                <div key={c} className="flex justify-between text-sm border-b border-border/40 last:border-0 py-1">
                  <span>{c}</span><span className="font-mono">{n as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Top performers</div>
            <ol className="space-y-1.5 text-sm">
              {topPerformers.length === 0 && <li className="text-muted-foreground text-xs">No reviews yet.</li>}
              {topPerformers.map((t, i) => t.founder && (
                <li key={t.founder.id} className="flex items-center justify-between gap-2">
                  <Link to="/os/workspace/$founderId" params={{ founderId: t.founder.id }} className="truncate hover:text-accent">
                    {i + 1}. {t.founder.startup_name}
                  </Link>
                  <span className="font-mono text-xs">{t.score}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card className="border-rose-300/60 bg-rose-50/30 shadow-none">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-rose-700 mb-3">At-risk startups</div>
            <ul className="space-y-1 text-sm">
              {alerts.map((a) => {
                const f = founders.find((x) => x.id === a.founder_id);
                return (
                  <li key={a.id} className="flex justify-between">
                    <Link to="/os/workspace/$founderId" params={{ founderId: a.founder_id }} className="hover:underline">{f?.startup_name ?? "—"}</Link>
                    <span className="text-muted-foreground text-xs">{a.reason}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
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

function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone: "green"|"yellow"|"red"|"muted" }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const color = { green: "bg-status-green", yellow: "bg-status-yellow", red: "bg-status-red", muted: "bg-muted-foreground/40" }[tone];
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="text-muted-foreground">{value} · {pct}%</span></div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
