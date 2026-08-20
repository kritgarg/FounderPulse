import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const STAGE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "color-mix(in oklab, var(--color-chart-1) 60%, var(--color-chart-4))",
];

function Dashboard() {
  const [stats, setStats] = useState({ total: 0, green: 0, yellow: 0, red: 0 });
  const [byStage, setByStage] = useState<{ name: string; value: number }[]>([]);
  const [byCampus, setByCampus] = useState<{ name: string; value: number }[]>([]);
  const [monthly, setMonthly] = useState<{ month: string; avg: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: founders } = await supabase.from("founders").select("id, stage, campus");
      const { data: evals } = await supabase
        .from("evaluations")
        .select("founder_id, total_score, status, month_number, year, created_at")
        .order("created_at", { ascending: true });

      const total = founders?.length ?? 0;
      const latest = new Map<string, any>();
      evals?.forEach((e) => {
        latest.set(e.founder_id, e);
      });
      let g = 0,
        y = 0,
        r = 0;
      latest.forEach((e) => {
        if (e.status === "green") g++;
        else if (e.status === "yellow") y++;
        else if (e.status === "red") r++;
      });
      setStats({ total, green: g, yellow: y, red: r });

      const stageMap = new Map<string, number>();
      founders?.forEach((f) => stageMap.set(f.stage, (stageMap.get(f.stage) || 0) + 1));
      setByStage(Array.from(stageMap, ([name, value]) => ({ name, value })));

      const campusMap = new Map<string, number>();
      founders?.forEach((f) => {
        const c = f.campus || "Unknown";
        campusMap.set(c, (campusMap.get(c) || 0) + 1);
      });
      setByCampus(Array.from(campusMap, ([name, value]) => ({ name, value })));

      const monthMap = new Map<string, { sum: number; n: number }>();
      evals?.forEach((e) => {
        const k = `${e.year}-${String(e.month_number).padStart(2, "0")}`;
        const cur = monthMap.get(k) || { sum: 0, n: 0 };
        cur.sum += e.total_score ?? 0;
        cur.n += 1;
        monthMap.set(k, cur);
      });
      setMonthly(
        Array.from(monthMap, ([month, v]) => ({ month, avg: Math.round(v.sum / v.n) })).sort((a, b) =>
          a.month.localeCompare(b.month),
        ),
      );
    })();
  }, []);

  const reviewed = stats.green + stats.yellow + stats.red;
  const healthPct = reviewed > 0 ? Math.round((stats.green / reviewed) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="flex items-end justify-between flex-wrap gap-6 pb-2 border-b border-border/70">
        <div className="space-y-2">
          <div className="text-[10.5px] uppercase tracking-[0.25em] text-muted-foreground">
            Cohort · {new Date().toLocaleString("en", { month: "long", year: "numeric" })}
          </div>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-tight">
            Portfolio <span className="italic text-accent">overview</span>.
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-xl">
            A live read on every founder pursuing the startup track — health, stage, and momentum.
          </p>
        </div>
        <Link
          to="/founders"
          className="group inline-flex items-center gap-1.5 text-sm font-medium border-b border-foreground/30 pb-0.5 hover:border-foreground transition-colors"
        >
          Open portfolio
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/70 rounded-xl overflow-hidden border border-border/70">
        <Stat label="Founders" value={stats.total} hint="active in track" />
        <Stat label="On Track" value={stats.green} accent="green" hint={`${healthPct}% of reviewed`} />
        <Stat label="Watch" value={stats.yellow} accent="yellow" hint="1:1 recommended" />
        <Stat label="At Risk" value={stats.red} accent="red" hint="board escalation" />
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border-border/70 shadow-none">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                Trend
              </div>
              <CardTitle className="font-display text-xl">Average monthly score</CardTitle>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> rolling
            </div>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avg" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Distribution
            </div>
            <CardTitle className="font-display text-xl">Stage mix</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byStage}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {byStage.map((_, i) => (
                    <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-1 text-[11px]">
              {byStage.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }}
                  />
                  <span className="capitalize text-muted-foreground">{s.name}</span>
                  <span className="font-mono tabular">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Geography
            </div>
            <CardTitle className="font-display text-xl">Campus distribution</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCampus} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
                  width={140}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="var(--color-chart-2)" radius={[0, 3, 3, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "green" | "yellow" | "red";
}) {
  const dot =
    accent === "green"
      ? "bg-status-green-foreground/70"
      : accent === "yellow"
        ? "bg-status-yellow-foreground/70"
        : accent === "red"
          ? "bg-status-red-foreground/70"
          : "bg-foreground/40";
  return (
    <div className="bg-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      </div>
      <div className="font-display text-5xl leading-none tabular">{value}</div>
      {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
