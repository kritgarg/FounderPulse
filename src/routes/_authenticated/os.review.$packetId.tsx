import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { evaluateSubmissionPacket } from "@/lib/ai-evaluation.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/os/review/$packetId")({
  component: ReviewDetail,
});

function ReviewDetail() {
  const { packetId } = Route.useParams();
  const { isStaff, user } = useAuth();
  const runAi = useServerFn(evaluateSubmissionPacket);
  const [packet, setPacket] = useState<any>(null);
  const [founder, setFounder] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [ai, setAi] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const [f, setF] = useState({
    execution_score: 0, customer_score: 0, business_score: 0, behavior_score: 0,
    status: "yellow" as "green" | "yellow" | "red",
    decision: "approve" as "approve" | "reject" | "resubmit" | "edit",
    comments: "",
  });

  const load = async () => {
    const { data: p } = await supabase.from("submission_packets").select("*").eq("id", packetId).single();
    if (!p) return;
    setPacket(p);
    const [{ data: fr }, { data: ev }, { data: ax }] = await Promise.all([
      supabase.from("founders").select("*").eq("id", p.founder_id).single(),
      supabase.from("evidence_items").select("*").eq("founder_id", p.founder_id).order("created_at", { ascending: false }),
      supabase.from("ai_evaluations").select("*").eq("packet_id", packetId).order("generated_at", { ascending: false }).limit(1),
    ]);
    setFounder(fr); setEvidence(ev ?? []);
    if (ax && ax.length > 0) {
      const latest = ax[0] as any;
      setAi(latest);
      setF((prev) => ({
        ...prev,
        execution_score: latest.suggested_execution ?? prev.execution_score,
        customer_score: latest.suggested_customer ?? prev.customer_score,
        business_score: latest.suggested_business ?? prev.business_score,
        behavior_score: latest.suggested_behavior ?? prev.behavior_score,
        status: (latest.suggested_status as any) ?? prev.status,
      }));
    }
  };
  useEffect(() => { load(); }, [packetId]);

  async function runEvaluation() {
    setRunning(true);
    try {
      const r = await runAi({ data: { packetId } });
      setAi((r as any).ai);
      toast.success("AI evaluation generated");
    } catch (e: any) {
      toast.error(e?.message ?? "AI evaluation failed");
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    const total = f.execution_score + f.customer_score + f.business_score + f.behavior_score;
    const { error } = await supabase.from("faculty_reviews").insert({
      packet_id: packetId,
      founder_id: packet.founder_id,
      reviewer_id: user?.id,
      execution_score: f.execution_score,
      customer_score: f.customer_score,
      business_score: f.business_score,
      behavior_score: f.behavior_score,
      total_score: total,
      status: f.status,
      decision: f.decision,
      comments: f.comments,
      decided_at: new Date().toISOString(),
    } as any);
    if (error) return toast.error(error.message);
    if (f.decision === "approve") {
      await supabase.from("submission_packets").update({ locked: true }).eq("id", packetId);
    }
    toast.success("Review recorded");
  }

  if (!isStaff) return <div className="text-muted-foreground">Staff access only.</div>;
  if (!packet) return <div className="text-muted-foreground">Loading…</div>;

  const total = f.execution_score + f.customer_score + f.business_score + f.behavior_score;
  const autoStatus = total >= 70 ? "green" : total >= 50 ? "yellow" : "red";

  return (
    <div className="space-y-5">
      <Link to="/os/review" className="text-xs uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center hover:text-foreground">
        <ArrowLeft className="h-3 w-3 mr-1.5" /> Review queue
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-border/70">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Faculty review</div>
          <h1 className="font-display text-3xl tracking-tight">{founder?.startup_name}</h1>
          <p className="text-sm text-muted-foreground">{founder?.founder_name} · Month {packet.month}</p>
        </div>
        <Button size="sm" onClick={runEvaluation} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {ai ? "Regenerate AI" : "Generate AI evaluation"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Packet</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <P k="Summary" v={packet.summary} />
              <P k="Worked" v={packet.what_worked} />
              <P k="Failed" v={packet.what_failed} />
              <P k="Changed" v={packet.what_changed} />
              <P k="Assumptions invalidated" v={packet.assumptions_invalidated} />
              <P k="Next steps" v={packet.next_steps} />
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Evidence ({evidence.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {evidence.length === 0 && <div className="text-muted-foreground">No evidence uploaded.</div>}
              {evidence.map((e) => (
                <div key={e.id} className="flex items-center gap-2 border-b border-border/40 last:border-0 py-1">
                  <span className="capitalize text-muted-foreground text-[10px] uppercase tracking-wider w-20">{e.category}</span>
                  <span className="flex-1 truncate">{e.title}</span>
                  {e.month && <span className="text-[10px] text-muted-foreground">M{e.month}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {ai && (
            <Card className="border-accent/30 bg-accent/5 shadow-none">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <CardTitle className="text-xs uppercase tracking-wider">AI assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <P k="Strengths" v={ai.strengths} />
                <P k="Weaknesses" v={ai.weaknesses} />
                <P k="Risks" v={ai.risks} />
                <P k="Missing" v={ai.missing} />
                <div className="text-xs grid grid-cols-4 gap-2 pt-1">
                  <span>Exec: {ai.suggested_execution}/40</span>
                  <span>Cust: {ai.suggested_customer}/25</span>
                  <span>Biz: {ai.suggested_business}/20</span>
                  <span>Beh: {ai.suggested_behavior}/15</span>
                </div>
                <div className="text-xs"><strong>Suggested total:</strong> {ai.suggested_total}/100 · {ai.suggested_status}</div>
                {ai.faculty_summary && <div className="text-xs italic text-muted-foreground">{ai.faculty_summary}</div>}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-base">Score & decision</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <NumF label="Execution / 40" value={f.execution_score} max={40} onChange={(v) => setF({ ...f, execution_score: v })} />
                <NumF label="Customer / 25" value={f.customer_score} max={25} onChange={(v) => setF({ ...f, customer_score: v })} />
                <NumF label="Business / 20" value={f.business_score} max={20} onChange={(v) => setF({ ...f, business_score: v })} />
                <NumF label="Behaviour / 15" value={f.behavior_score} max={15} onChange={(v) => setF({ ...f, behavior_score: v })} />
              </div>
              <div className="text-sm">Total <strong className="font-mono">{total}/100</strong> · auto status: <strong className="capitalize">{autoStatus}</strong></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={f.status} onValueChange={(v: any) => setF({ ...f, status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">Green (on track)</SelectItem>
                      <SelectItem value="yellow">Yellow (watch)</SelectItem>
                      <SelectItem value="red">Red (at risk)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Decision</Label>
                  <Select value={f.decision} onValueChange={(v: any) => setF({ ...f, decision: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve & publish</SelectItem>
                      <SelectItem value="edit">Edit (private)</SelectItem>
                      <SelectItem value="resubmit">Request resubmission</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faculty comments</Label>
                <Textarea value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} className="mt-1" rows={4} />
              </div>
              <div className="flex justify-end"><Button size="sm" onClick={save}>Record review</Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function P({ k, v }: { k: string; v: any }) {
  return <div><span className="text-xs uppercase tracking-wider text-muted-foreground">{k}:</span> <div className="text-sm whitespace-pre-wrap">{v || "—"}</div></div>;
}
function NumF({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="number" min={0} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))} className="mt-1" />
    </div>
  );
}
