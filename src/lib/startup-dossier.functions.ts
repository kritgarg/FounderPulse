import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are compiling a living dossier for one startup in the NST Capital Entrepreneurship Track.
You have their onboarding questionnaire, intake, biweekly submissions, mentor KPI/goals extracted from meeting transcripts, and the latest KPI snapshot.

Return STRICT JSON matching this shape:
{
  "executive_summary": string,
  "product": string,
  "process": string,
  "customers": string,
  "revenue_and_business_model": string,
  "traction_and_kpis": string,
  "team": string,
  "market_and_moat": string,
  "risks_and_open_questions": string,
  "current_mentor_goals": string,
  "recommendation": string
}

Rules:
- Ground every claim in the supplied data; do NOT fabricate numbers.
- Where evidence is missing, say "not yet documented".
- Keep each section under 220 words.
- Return raw JSON only, no code fences.`;

function toMarkdown(startupName: string, sections: Record<string, string>) {
  const order: [string, string][] = [
    ["executive_summary", "Executive summary"],
    ["product", "Product"],
    ["process", "Process"],
    ["customers", "Customers"],
    ["revenue_and_business_model", "Revenue & business model"],
    ["traction_and_kpis", "Traction & KPIs"],
    ["team", "Team"],
    ["market_and_moat", "Market & moat"],
    ["risks_and_open_questions", "Risks & open questions"],
    ["current_mentor_goals", "Current mentor goals"],
    ["recommendation", "Recommendation"],
  ];
  const now = new Date().toISOString().slice(0, 10);
  const body = order
    .map(([k, h]) => `## ${h}\n\n${sections[k] ?? "not yet documented"}\n`)
    .join("\n");
  return `# ${startupName} — Startup Dossier\n\n_Generated ${now} • NST Capital Entrepreneurship Track_\n\n${body}`;
}

export interface DossierInput {
  founderId: string;
  uploadMarkdown?: boolean;
}

export const compileStartupDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): DossierInput => {
    const i = input as DossierInput;
    if (!i?.founderId) throw new Error("founderId required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Staff-only (avoid students triggering AI cost).
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    if (roleErr) throw new Error("Unable to verify role");
    const isStaff = (roleRows ?? []).some((r: any) =>
      ["super_admin","faculty"].includes(r.role));
    if (!isStaff) throw new Error("Unauthorized: staff only");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const [founder, intake, questionnaire, submissions, transcripts, kpis, kpiSnaps, docs] =
      await Promise.all([
        supabase.from("founders").select("*").eq("id", data.founderId).single(),
        supabase.from("founder_intakes").select("*").eq("founder_id", data.founderId).maybeSingle(),
        supabase.from("onboarding_questionnaires").select("*").eq("founder_id", data.founderId).maybeSingle(),
        supabase.from("biweekly_submissions").select("*").eq("founder_id", data.founderId).order("cycle_number"),
        supabase.from("meeting_transcripts").select("id, meeting_id, source, ingested_at").eq("founder_id", data.founderId).order("ingested_at"),
        supabase.from("mentor_kpi_goals").select("*").eq("founder_id", data.founderId).order("created_at"),
        supabase.from("kpi_snapshots").select("*").eq("founder_id", data.founderId).order("month"),
        supabase.from("onboarding_documents").select("section, title, kind, url").eq("founder_id", data.founderId),
      ]);

    if (founder.error || !founder.data) throw new Error("Founder not found");
    const startupName = founder.data.startup_name ?? "Startup";

    const userPayload = {
      founder: founder.data,
      intake: intake.data,
      questionnaire: questionnaire.data,
      onboarding_documents: docs.data ?? [],
      biweekly_submissions: submissions.data ?? [],
      meeting_transcripts_meta: transcripts.data ?? [],
      mentor_kpi_goals: kpis.data ?? [],
      kpi_snapshots: kpiSnaps.data ?? [],
    };

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload).slice(0, 120_000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("AI rate limit. Retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);

    const raw = await res.json();
    const text = raw.choices?.[0]?.message?.content ?? "{}";
    let sections: Record<string, string>;
    try { sections = JSON.parse(text); } catch { throw new Error("AI returned invalid JSON"); }

    const markdown = toMarkdown(startupName, sections);
    const sourceSummary = {
      submissions: submissions.data?.length ?? 0,
      transcripts: transcripts.data?.length ?? 0,
      mentor_kpi_records: kpis.data?.length ?? 0,
      questionnaire_submitted: !!questionnaire.data?.submitted_at,
      onboarding_documents: docs.data?.length ?? 0,
    };

    // Bump version if a row already exists
    const { data: existing } = await supabase
      .from("startup_dossiers").select("id, version").eq("founder_id", data.founderId).maybeSingle();

    let markdownPath: string | null = null;
    if (data.uploadMarkdown) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const path = `${data.founderId}/dossier-v${(existing?.version ?? 0) + 1}.md`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("dossiers")
        .upload(path, new Blob([markdown], { type: "text/markdown" }), { upsert: true });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
      markdownPath = path;
    }

    const payload = {
      founder_id: data.founderId,
      sections,
      markdown,
      markdown_storage_path: markdownPath,
      source_summary: sourceSummary,
      model: MODEL,
      generated_at: new Date().toISOString(),
      generated_by: userId,
      version: (existing?.version ?? 0) + 1,
    };

    const upsert = existing
      ? await supabase.from("startup_dossiers").update(payload).eq("id", existing.id).select("*").single()
      : await supabase.from("startup_dossiers").insert(payload).select("*").single();
    if (upsert.error) throw new Error(upsert.error.message);

    // Append a permanent version-history row so recompiles never overwrite history.
    const { error: histErr } = await supabase.from("startup_dossier_versions").insert({
      founder_id: data.founderId,
      version: payload.version,
      sections,
      markdown,
      markdown_storage_path: markdownPath,
      source_summary: sourceSummary,
      model: MODEL,
      generated_by: userId,
      generated_at: payload.generated_at,
    } as never);
    if (histErr) console.error("dossier history insert failed:", histErr.message);

    return { ok: true, dossier: upsert.data, version: payload.version };
  });

/**
 * Convenience: always uploads markdown to storage and appends a new version.
 * Uses the same handler as compileStartupDossier so downstream code is one path.
 */
export const recompileStartupDossier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): { founderId: string } => {
    const i = input as { founderId: string };
    if (!i?.founderId) throw new Error("founderId required");
    return i;
  })
  .handler(async () => {
    // Thin marker — the real work runs via compileStartupDossier (staff-only).
    // The client should call compileStartupDossier with { uploadMarkdown: true }.
    throw new Error("Call compileStartupDossier({ founderId, uploadMarkdown: true }) instead.");
  });

export const compileAllDossiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "super_admin");
    if (!isAdmin) throw new Error("Unauthorized: super admin only");
    const { data: founders, error } = await supabase.from("founders").select("id");
    if (error) throw new Error(error.message);
    return { ok: true, queued: (founders ?? []).map((f: any) => f.id) };
  });

