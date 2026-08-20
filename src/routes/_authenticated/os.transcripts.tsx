import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mic, Sparkles, Upload, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  ingestManualTranscript,
  ingestFirefliesTranscript,
} from "@/lib/meeting-transcripts.functions";

export const Route = createFileRoute("/_authenticated/os/transcripts")({
  component: Transcripts,
});

function Transcripts() {
  const { isStaff, isMentor, loading } = useAuth();
  const canUse = isStaff || isMentor;

  const [founders, setFounders] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [founderId, setFounderId] = useState<string>("");
  const [meetingId, setMeetingId] = useState<string>("");
  const [mentorId, setMentorId] = useState<string>("");
  const [mode, setMode] = useState<"manual" | "fireflies">("manual");
  const [text, setText] = useState("");
  const [firefliesId, setFirefliesId] = useState("");
  const [busy, setBusy] = useState(false);

  const runManual = useServerFn(ingestManualTranscript);
  const runFireflies = useServerFn(ingestFirefliesTranscript);

  const load = async () => {
    const [f, m, mt, assign] = await Promise.all([
      supabase.from("founders").select("id, startup_name").order("startup_name"),
      supabase.from("biweekly_meetings").select("*").order("cycle_number"),
      supabase.from("program_mentors").select("*").order("rotation_order"),
      supabase.from("founder_meeting_assignments" as any).select("*"),
    ]);
    setFounders(f.data ?? []);
    setMeetings(m.data ?? []);
    setMentors(mt.data ?? []);
    setAssignments((assign as any)?.data ?? []);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!founderId) { setTranscripts([]); return; }
    supabase
      .from("meeting_transcripts")
      .select("id, meeting_id, source, ingested_at, meeting_started_at, duration_minutes, mentor_id")
      .eq("founder_id", founderId)
      .order("ingested_at", { ascending: false })
      .then(({ data }) => setTranscripts(data ?? []));
  }, [founderId, busy]);

  const meetingsById = useMemo(() => Object.fromEntries(meetings.map((m) => [m.id, m])), [meetings]);
  const mentorsById = useMemo(() => Object.fromEntries(mentors.map((m) => [m.id, m])), [mentors]);

  // Auto-suggest mentor from the founder_meeting_assignments view when both founder + meeting picked.
  useEffect(() => {
    if (!founderId || !meetingId) return;
    const match = assignments.find(
      (a: any) => a.founder_id === founderId && a.meeting_id === meetingId,
    );
    if (match?.mentor_id) setMentorId(match.mentor_id);
    else if (!mentorId && mentors[0]) setMentorId(mentors[0].id);
  }, [founderId, meetingId, assignments, mentors]);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!canUse) return <Navigate to="/os" replace />;

  const activeMeeting = meetingsById[meetingId];
  const activeMentor = mentorsById[mentorId];

  async function submit() {
    if (!founderId || !meetingId) return toast.error("Pick a founder and meeting");
    setBusy(true);
    try {
      if (mode === "manual") {
        if (text.trim().length < 50) throw new Error("Paste the transcript (min 50 chars)");
        await runManual({ data: { founderId, meetingId, mentorId: mentorId || undefined, transcript: text.trim() } });
        toast.success("Transcript ingested + AI extraction saved");
        setText("");
      } else {
        if (!firefliesId.trim()) throw new Error("Fireflies transcript ID required");
        await runFireflies({ data: { founderId, meetingId, mentorId: mentorId || undefined, firefliesTranscriptId: firefliesId.trim() } });
        toast.success("Pulled from Fireflies + AI extraction saved");
        setFirefliesId("");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <Mic className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Meeting transcripts</div>
          <div className="font-display text-2xl tracking-tight">Ingest bi-weekly meeting notes</div>
          <p className="text-xs text-muted-foreground mt-0.5">AI extracts KPIs, goals, risks & action items. Review in Mentor Review.</p>
        </div>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-[0.18em]">Upload transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Founder / Startup</Label>
              <Select value={founderId} onValueChange={setFounderId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick founder" /></SelectTrigger>
                <SelectContent>
                  {founders.map((f) => <SelectItem key={f.id} value={f.id}>{f.startup_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bi-weekly meeting</Label>
              <Select value={meetingId} onValueChange={setMeetingId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick cycle" /></SelectTrigger>
                <SelectContent>
                  {meetings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      Cycle {m.cycle_number} · {m.meeting_weekday} {new Date(m.meeting_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mentor {activeMentor && <span className="normal-case tracking-normal text-[10px] text-emerald-700">· auto-linked</span>}</Label>
              <Select value={mentorId} onValueChange={setMentorId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick mentor" /></SelectTrigger>
                <SelectContent>
                  {mentors.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeMeeting && (
            <div className="text-[11px] text-muted-foreground border border-border/60 rounded-md px-3 py-2 bg-muted/30">
              <span className="font-medium text-foreground">Linking to:</span> Cycle {activeMeeting.cycle_number} · {activeMeeting.meeting_weekday} {new Date(activeMeeting.meeting_date).toLocaleDateString()} · window {new Date(activeMeeting.period_start).toLocaleDateString()} → {new Date(activeMeeting.period_end).toLocaleDateString()}{activeMentor ? ` · mentor ${activeMentor.full_name}` : ""}
            </div>
          )}


          <div className="inline-flex rounded-md border border-border/70 overflow-hidden text-xs">
            <button onClick={() => setMode("manual")}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${mode === "manual" ? "bg-foreground text-background" : "hover:bg-muted"}`}>
              <Upload className="h-3 w-3" /> Manual paste
            </button>
            <button onClick={() => setMode("fireflies")}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 border-l border-border/70 ${mode === "fireflies" ? "bg-foreground text-background" : "hover:bg-muted"}`}>
              <Zap className="h-3 w-3" /> Fireflies auto-pull
            </button>
          </div>

          {mode === "manual" ? (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Paste transcript</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="mt-1 font-mono text-xs"
                placeholder={"Vivek: How did the pilot go?\nFounder: We closed 2 LOIs this cycle...\n..."} />
              <p className="text-[10px] text-muted-foreground mt-1">Speaker-labelled lines work best. Max ~60k chars used for extraction.</p>
            </div>
          ) : (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fireflies transcript ID</Label>
              <Input value={firefliesId} onChange={(e) => setFirefliesId(e.target.value)}
                placeholder="e.g. 01H8..." className="mt-1 font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">Find it in the Fireflies transcript URL. Uses the linked workspace connection.</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" disabled={busy || !founderId || !meetingId} onClick={submit}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {busy ? "Ingesting…" : mode === "manual" ? "Ingest & extract" : "Pull & extract"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {founderId && (
        <Card className="border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-[0.18em]">Existing transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            {transcripts.length === 0 ? (
              <div className="text-xs text-muted-foreground">No transcripts yet for this founder.</div>
            ) : (
              <div className="space-y-2">
                {transcripts.map((t) => {
                  const m = meetingsById[t.meeting_id];
                  return (
                    <div key={t.id} className="flex items-center justify-between text-xs border border-border/60 rounded-md px-3 py-2">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <div>
                          <div className="font-medium">Cycle {m?.cycle_number ?? "?"} · {new Date(t.ingested_at).toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {t.duration_minutes ? `${t.duration_minutes} min · ` : ""}
                            {t.source}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">{t.source}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
