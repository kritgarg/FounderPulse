import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/os/review")({
  component: ReviewQueue,
});

function ReviewQueue() {
  const { isStaff } = useAuth();
  const [packets, setPackets] = useState<any[]>([]);
  const [founders, setFounders] = useState<Record<string, any>>({});
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isStaff) return;
    (async () => {
      const { data: p } = await supabase
        .from("submission_packets")
        .select("*")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });
      const ids = (p ?? []).map((x: any) => x.founder_id);
      const { data: f } = await supabase.from("founders").select("id, founder_name, startup_name, campus").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const map: Record<string, any> = {};
      (f ?? []).forEach((x: any) => (map[x.id] = x));
      const { data: r } = await supabase.from("faculty_reviews").select("packet_id, decision").in("packet_id", (p ?? []).map((x: any) => x.id) || []);
      const done = new Set<string>(((r ?? []) as any[]).filter((x) => x.decision === "approve").map((x) => x.packet_id));
      setPackets(p ?? []); setFounders(map); setReviewed(done);
    })();
  }, [isStaff]);

  if (!isStaff) return <div className="text-muted-foreground">Staff access only.</div>;

  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border/70">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Startup</th>
              <th className="text-left px-5 py-3 font-medium">Founder</th>
              <th className="text-left px-5 py-3 font-medium">Month</th>
              <th className="text-left px-5 py-3 font-medium">Submitted</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {packets.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted-foreground p-10">No submitted packets yet.</td></tr>
            )}
            {packets.map((p) => {
              const f = founders[p.founder_id] ?? {};
              const done = reviewed.has(p.id);
              return (
                <tr key={p.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Link to="/os/review/$packetId" params={{ packetId: p.id }} className="font-display font-medium hover:text-accent">
                      {f.startup_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{f.founder_name ?? "—"}</td>
                  <td className="px-5 py-3">M{p.month}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(p.submitted_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {done ? <Badge className="bg-status-green/15 text-status-green border-0">Reviewed</Badge>
                          : <Badge variant="outline" className="border-border/70 text-muted-foreground">Pending</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
