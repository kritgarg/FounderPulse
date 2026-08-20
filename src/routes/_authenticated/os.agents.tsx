import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";
import { listAgents, runAgentNow, toggleAgent } from "@/lib/agents/agents.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Play, Bot, Clock, Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/agents")({
  component: AgentsPage,
});

const CHANNEL_LABEL: Record<string, string> = {
  resend: "Resend",
  slack: "Slack",
  google_calendar: "Google Calendar",
  notion: "Notion",
  lovable_ai: "Lovable AI",
};

function AgentsPage() {
  const { isStaff, isLeadership, loading } = useAuth();
  const [configs, setConfigs] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const r = await listAgents();
    setConfigs(r.configs);
    setRuns(r.runs);
  }
  useEffect(() => { if (isStaff || isLeadership) void refresh(); }, [isStaff, isLeadership]);

  if (loading) return null;
  if (!isStaff && !isLeadership) return <Navigate to="/os" />;

  async function runNow(slug: string) {
    setBusy(slug);
    try {
      const r = await runAgentNow({ data: { slug } });
      toast.success(`${slug}: ${r.processed} item(s) processed`);
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "run failed"); }
    finally { setBusy(null); }
  }

  async function onToggle(slug: string, enabled: boolean) {
    try {
      await toggleAgent({ data: { slug, enabled } });
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "toggle failed"); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight">Autonomous Agents</h1>
          <p className="text-sm text-muted-foreground">
            Bots that run the operation across Slack, Resend, Google Calendar, Notion, and Lovable AI.
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {configs.map((c) => {
          const lastRun = runs.find((r) => r.agent_slug === c.slug);
          return (
            <Card key={c.slug} className="border border-border/70">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium tracking-tight">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </div>
                  <Switch
                    checked={c.enabled}
                    onCheckedChange={(v) => onToggle(c.slug, v)}
                    aria-label="enabled"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" /> {c.cadence}
                  </Badge>
                  {(c.channels ?? []).map((ch: string) => (
                    <Badge key={ch} variant="secondary">{CHANNEL_LABEL[ch] ?? ch}</Badge>
                  ))}
                  {c.last_status && (
                    <Badge variant={c.last_status === "success" ? "default" : "destructive"}>
                      last: {c.last_status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    {c.last_run_at ? `Last ran ${new Date(c.last_run_at).toLocaleString()}` : "Never run"}
                  </div>
                  <Button size="sm" variant="outline" disabled={busy === c.slug} onClick={() => runNow(c.slug)}>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    {busy === c.slug ? "Running…" : "Run now"}
                  </Button>
                </div>
                {lastRun?.summary && (
                  <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                    {lastRun.summary}{lastRun.error ? ` — ${lastRun.error}` : ""}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="text-sm font-medium tracking-tight mb-2 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" /> Recent runs
        </h2>
        <div className="border border-border/70 rounded-md overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Agent</th>
                <th className="text-left p-2">Started</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Processed</th>
                <th className="text-left p-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 25).map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="p-2 font-medium">{r.agent_slug}</td>
                  <td className="p-2 text-muted-foreground">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="p-2">
                    <Badge variant={r.status === "success" ? "default" : r.status === "running" ? "outline" : "destructive"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-2">{r.items_processed}</td>
                  <td className="p-2 text-muted-foreground">{r.error ?? r.summary ?? "—"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No runs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
