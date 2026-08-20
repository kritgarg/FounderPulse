import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";
const FIREFLIES_GATEWAY = "https://connector-gateway.lovable.dev/fireflies/graphql";

const EXTRACT_PROMPT = `You read a mentor <> founder biweekly meeting transcript and return a JSON object:
{
  "kpis": [{"name": string, "target": string, "timeframe": string, "current": string?}],
  "goals": [{"title": string, "due_by": string?, "success_criteria": string}],
  "risks": [{"description": string, "severity": "low"|"medium"|"high"}],
  "action_items": [{"owner": "founder"|"mentor", "task": string, "due_by": string?}],
  "mentor_sentiment": "supportive"|"cautious"|"concerned"|"excited"|"neutral",
  "next_review_focus": string
}
Return raw JSON only. If a field is unknown, use an empty array or empty string.`;

async function fireflies(query: string, variables: Record<string, unknown>) {
  const flkey = process.env.FIREFLIES_API_KEY;
  const lovable = process.env.LOVABLE_API_KEY;
  if (!flkey) throw new Error("Fireflies connector not linked");
  if (!lovable) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(FIREFLIES_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": flkey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Fireflies error ${res.status}: ${body}`);
  const parsed = JSON.parse(body);
  if (parsed.errors) throw new Error(`Fireflies GraphQL: ${JSON.stringify(parsed.errors)}`);
  return parsed.data;
}

async function runExtraction(transcript: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: `TRANSCRIPT:\n${transcript.slice(0, 60_000)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit. Retry shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(text); } catch { throw new Error("AI returned invalid JSON"); }
}

async function assertStaff(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Unable to verify role");
  const staff = (data ?? []).some((r: any) => ["super_admin","faculty"].includes(r.role));
  if (!staff) throw new Error("Unauthorized: staff only");
}

// -------- Manual transcript ingestion (paste text) --------
export interface ManualIngestInput {
  meetingId: string;
  founderId: string;
  mentorId?: string;
  transcript: string;
  meetingStartedAt?: string;
  durationMinutes?: number;
}

export const ingestManualTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): ManualIngestInput => {
    const i = input as ManualIngestInput;
    if (!i?.meetingId || !i?.founderId || !i?.transcript) {
      throw new Error("meetingId, founderId, transcript required");
    }
    if (i.transcript.length < 50) throw new Error("Transcript too short");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const { data: tr, error: trErr } = await supabase
      .from("meeting_transcripts")
      .upsert({
        meeting_id: data.meetingId,
        founder_id: data.founderId,
        mentor_id: data.mentorId ?? null,
        source: "manual",
        transcript: data.transcript,
        meeting_started_at: data.meetingStartedAt ?? null,
        duration_minutes: data.durationMinutes ?? null,
        ingested_by: userId,
      }, { onConflict: "meeting_id,founder_id" })
      .select("*")
      .single();
    if (trErr) throw new Error(trErr.message);

    const parsed = await runExtraction(data.transcript);
    const { data: kpi, error: kpiErr } = await supabase
      .from("mentor_kpi_goals")
      .insert({
        transcript_id: tr.id,
        founder_id: data.founderId,
        meeting_id: data.meetingId,
        kpis: parsed.kpis ?? [],
        goals: parsed.goals ?? [],
        risks: parsed.risks ?? [],
        action_items: parsed.action_items ?? [],
        mentor_sentiment: parsed.mentor_sentiment ?? null,
        next_review_focus: parsed.next_review_focus ?? null,
        raw_json: parsed,
      })
      .select("*")
      .single();
    if (kpiErr) throw new Error(kpiErr.message);

    return { ok: true, transcript: tr, kpi };
  });

// -------- Fireflies auto-pull --------
export interface FirefliesIngestInput {
  meetingId: string;
  founderId: string;
  mentorId?: string;
  firefliesTranscriptId: string;
}

export const ingestFirefliesTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): FirefliesIngestInput => {
    const i = input as FirefliesIngestInput;
    if (!i?.meetingId || !i?.founderId || !i?.firefliesTranscriptId) {
      throw new Error("meetingId, founderId, firefliesTranscriptId required");
    }
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    const query = `query T($id: String!) {
      transcript(id: $id) {
        id
        title
        date
        duration
        sentences { speaker_name text }
      }
    }`;
    const gql = await fireflies(query, { id: data.firefliesTranscriptId });
    const t = gql?.transcript;
    if (!t) throw new Error("Fireflies transcript not found");
    const transcript = (t.sentences ?? [])
      .map((s: any) => `${s.speaker_name ?? "?"}: ${s.text}`)
      .join("\n") || t.title || "";
    if (!transcript) throw new Error("Empty Fireflies transcript");

    const { data: tr, error: trErr } = await supabase
      .from("meeting_transcripts")
      .upsert({
        meeting_id: data.meetingId,
        founder_id: data.founderId,
        mentor_id: data.mentorId ?? null,
        source: "fireflies",
        fireflies_transcript_id: t.id,
        transcript,
        meeting_started_at: t.date ? new Date(t.date).toISOString() : null,
        duration_minutes: t.duration ? Math.round(t.duration) : null,
        ingested_by: userId,
      }, { onConflict: "meeting_id,founder_id" })
      .select("*")
      .single();
    if (trErr) throw new Error(trErr.message);

    const parsed = await runExtraction(transcript);
    const { data: kpi, error: kpiErr } = await supabase
      .from("mentor_kpi_goals")
      .insert({
        transcript_id: tr.id,
        founder_id: data.founderId,
        meeting_id: data.meetingId,
        kpis: parsed.kpis ?? [],
        goals: parsed.goals ?? [],
        risks: parsed.risks ?? [],
        action_items: parsed.action_items ?? [],
        mentor_sentiment: parsed.mentor_sentiment ?? null,
        next_review_focus: parsed.next_review_focus ?? null,
        raw_json: parsed,
      })
      .select("*")
      .single();
    if (kpiErr) throw new Error(kpiErr.message);

    return { ok: true, transcript: tr, kpi };
  });

// -------- Update AI-extracted KPI/goals row (mentor verification) --------
export interface UpdateKpiGoalsInput {
  id: string;
  kpis?: unknown;
  goals?: unknown;
  risks?: unknown;
  action_items?: unknown;
  mentor_sentiment?: string | null;
  next_review_focus?: string | null;
  note?: string;
}

const AUDITABLE_FIELDS = [
  "kpis","goals","risks","action_items","mentor_sentiment","next_review_focus",
] as const;

function normalize(v: unknown) {
  if (v === undefined) return null;
  return v ?? null;
}
function changed(before: unknown, after: unknown) {
  return JSON.stringify(normalize(before)) !== JSON.stringify(normalize(after));
}

export const updateMentorKpiGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): UpdateKpiGoalsInput => {
    const i = input as UpdateKpiGoalsInput;
    if (!i?.id) throw new Error("id required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    // Load existing row for diff
    const { data: existing, error: exErr } = await supabase
      .from("mentor_kpi_goals")
      .select("*")
      .eq("id", data.id)
      .single();
    if (exErr || !existing) throw new Error("KPI row not found");

    const patch: Record<string, unknown> = {};
    const audits: Array<{ field: string; before: unknown; after: unknown }> = [];
    for (const k of AUDITABLE_FIELDS) {
      if (data[k] !== undefined) {
        patch[k] = data[k] as never;
        if (changed((existing as any)[k], data[k])) {
          audits.push({ field: k, before: (existing as any)[k] ?? null, after: data[k] ?? null });
        }
      }
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { data: row, error } = await supabase
      .from("mentor_kpi_goals").update(patch as never).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);

    if (audits.length > 0) {
      const rows = audits.map((a) => ({
        kpi_goal_id: data.id,
        transcript_id: existing.transcript_id,
        founder_id: existing.founder_id,
        edited_by: userId,
        field: a.field,
        before_value: a.before as never,
        after_value: a.after as never,
        note: data.note ?? null,
      }));
      const { error: audErr } = await supabase
        .from("mentor_kpi_edit_audit").insert(rows as never);
      if (audErr) {
        // don't roll back the save, but surface it
        console.error("audit insert failed:", audErr.message);
      }
    }

    return { ok: true, row, edits: audits.length };
  });

/** List audit entries for one KPI/goal row (staff, mentor, or founder-owner). */
export const listKpiEditAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): { kpiGoalId: string } => {
    const i = input as { kpiGoalId: string };
    if (!i?.kpiGoalId) throw new Error("kpiGoalId required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("mentor_kpi_edit_audit")
      .select("*")
      .eq("kpi_goal_id", data.kpiGoalId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });


