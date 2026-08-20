import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2, ShieldCheck, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/baseline")({
  component: BaselineReview,
});

type Founder = {
  id: string;
  founder_name: string;
  startup_name: string;
  campus: string | null;
  batch: string | null;
  industry: string | null;
  team_size: number | null;
  stage: string;
  description: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
};

type AuditEntry = {
  id: string;
  action: string;
  performed_by_email: string | null;
  record_type: string;
  record_count: number;
  notes: string | null;
  created_at: string;
};

function BaselineReview() {
  const { isAdmin, user } = useAuth();
  const [rows, setRows] = useState<Founder[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase
        .from("founders")
        .select("*")
        .eq("batch", "Entrepreneurship Track")
        .order("created_at", { ascending: true }),
      supabase
        .from("import_audit_log")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    setRows((f as any) ?? []);
    setAudit((a as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  async function verifyOne(id: string) {
    const { error } = await supabase
      .from("founders")
      .update({ verified: true, verified_at: new Date().toISOString(), verified_by: user?.id })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("import_audit_log").insert({
      action: "founder_verified",
      performed_by: user?.id,
      performed_by_email: user?.email,
      record_type: "founders",
      record_ids: [id],
      record_count: 1,
    });
    toast.success("Verified");
    load();
  }

  async function verifyAll() {
    const ids = rows.filter((r) => !r.verified).map((r) => r.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("founders")
      .update({ verified: true, verified_at: new Date().toISOString(), verified_by: user?.id })
      .in("id", ids);
    if (error) return toast.error(error.message);
    await supabase.from("import_audit_log").insert({
      action: "baseline_bulk_verify",
      performed_by: user?.id,
      performed_by_email: user?.email,
      record_type: "founders",
      record_ids: ids,
      record_count: ids.length,
      notes: "Bulk verification of baseline founders.",
    });
    toast.success(`${ids.length} records verified`);
    load();
  }

  function csv(values: (string | number | null | undefined)[][]) {
    return values
      .map((row) =>
        row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
  }

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportFounders() {
    const header = [
      "id",
      "founder_name",
      "startup_name",
      "campus",
      "batch",
      "industry",
      "team_size",
      "stage",
      "verified",
      "verified_at",
      "created_at",
      "description",
    ];
    download(
      "baseline_founders.csv",
      csv([
        header,
        ...rows.map((r) => [
          r.id,
          r.founder_name,
          r.startup_name,
          r.campus,
          r.batch,
          r.industry,
          r.team_size,
          r.stage,
          r.verified ? "yes" : "no",
          r.verified_at,
          r.created_at,
          r.description,
        ]),
      ]),
    );
  }

  function exportStartups() {
    const grouped = new Map<string, Founder[]>();
    rows.forEach((r) => {
      const k = r.startup_name;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(r);
    });
    const header = ["startup_name", "campus", "industry", "stage", "team_size", "founder_count", "founders"];
    const out = Array.from(grouped.entries()).map(([name, fs]) => [
      name,
      fs[0].campus,
      fs[0].industry,
      fs[0].stage,
      fs[0].team_size,
      fs.length,
      fs.map((f) => f.founder_name).join(" | "),
    ]);
    download("baseline_startups.csv", csv([header, ...out]));
  }

  function exportTeamMapping() {
    const header = ["startup_name", "founder_id", "founder_name", "role", "campus"];
    const grouped = new Map<string, Founder[]>();
    rows.forEach((r) => {
      const k = r.startup_name;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(r);
    });
    const out: (string | number | null)[][] = [];
    grouped.forEach((fs, startup) => {
      fs.forEach((f, idx) => {
        out.push([startup, f.id, f.founder_name, idx === 0 ? "Founder" : "Co-founder", f.campus]);
      });
    });
    download("baseline_team_mapping.csv", csv([header, ...out]));
  }

  if (!isAdmin)
    return <div className="text-muted-foreground">Super admin access only.</div>;

  const verifiedCount = rows.filter((r) => r.verified).length;
  const startupCount = new Set(rows.map((r) => r.startup_name)).size;

  return (
    <div className="space-y-8">
      <header className="space-y-3 pb-2 border-b border-border/70">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Access Control
        </Link>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="text-[10.5px] uppercase tracking-[0.25em] text-muted-foreground">
              Admin Review
            </div>
            <h1 className="font-display text-4xl leading-[1.02] tracking-tight">
              Baseline records <span className="italic text-accent">verification</span>.
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Review and confirm the {rows.length} baseline founder + startup records before they are
              finalized in the portfolio. Audit log is recorded for every action.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportFounders}>
              <Download className="h-4 w-4 mr-1.5" /> Founders CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportStartups}>
              <Download className="h-4 w-4 mr-1.5" /> Startups CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportTeamMapping}>
              <Download className="h-4 w-4 mr-1.5" /> Team Mapping CSV
            </Button>
            <Button size="sm" onClick={verifyAll} disabled={verifiedCount === rows.length}>
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Verify all
            </Button>
          </div>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Founders" value={rows.length} />
        <StatCard label="Distinct startups" value={startupCount} />
        <StatCard label="Verified" value={`${verifiedCount} / ${rows.length}`} />
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">17 baseline records pending review</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Founder</th>
                  <th className="text-left px-5 py-3 font-medium">Startup</th>
                  <th className="text-left px-5 py-3 font-medium">Campus</th>
                  <th className="text-left px-5 py-3 font-medium">Team</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No baseline records found.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                    <td className="px-5 py-3.5 font-display font-medium">
                      <Link
                        to="/founders/$id"
                        params={{ id: r.id }}
                        className="hover:text-accent"
                      >
                        {r.founder_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-foreground/80">{r.startup_name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{r.campus ?? "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.team_size ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      {r.verified ? (
                        <Badge variant="secondary" className="bg-status-green/15 text-status-green border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border/70 text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!r.verified && (
                        <Button size="sm" variant="ghost" onClick={() => verifyOne(r.id)}>
                          Verify
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Import audit log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
              <tr>
                <th className="text-left px-5 py-3 font-medium">When</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
                <th className="text-left px-5 py-3 font-medium">Performed by</th>
                <th className="text-left px-5 py-3 font-medium">Records</th>
                <th className="text-left px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No audit entries yet.
                  </td>
                </tr>
              )}
              {audit.map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="border-border/70 font-mono text-[10px]">
                      {a.action}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs">{a.performed_by_email ?? "system"}</td>
                  <td className="px-5 py-3 text-xs">
                    {a.record_count} {a.record_type}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground max-w-md truncate">
                    {a.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="pt-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="font-display text-3xl mt-2 tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
