/**
 * Autonomous agent runner. Server-only.
 * Each agent is a small async function that reads the DB via the service-role
 * client, does work (nudge, notify, compile, digest), logs an agent_runs row.
 *
 * Channels used:
 *   - resend            (RESEND_API_KEY, via connector gateway)
 *   - slack             (SLACK_API_KEY, via connector gateway)
 *   - google_calendar   (GOOGLE_CALENDAR_API_KEY, via connector gateway)
 *   - notion            (NOTION_API_KEY, via connector gateway)
 *   - lovable_ai        (LOVABLE_API_KEY, native)
 */

const GATEWAY = "https://connector-gateway.lovable.dev";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type RunDetail = { level: "info" | "warn" | "error"; msg: string; ref?: string };

interface RunContext {
  slug: string;
  triggeredBy: string;
  details: RunDetail[];
  processed: number;
}

function log(ctx: RunContext, level: RunDetail["level"], msg: string, ref?: string) {
  ctx.details.push({ level, msg, ref });
}

async function slackPost(text: string, channel?: string) {
  const lk = process.env.LOVABLE_API_KEY;
  const sk = process.env.SLACK_API_KEY;
  if (!lk || !sk) return { ok: false, reason: "missing-slack-keys" };
  const res = await fetch(`${GATEWAY}/slack/api/chat.postMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lk}`,
      "X-Connection-Api-Key": sk,
    },
    body: JSON.stringify({ channel: channel ?? "#nst-venture-ops", text }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: !!body?.ok, reason: body?.error ?? `${res.status}` };
}

async function resendEmail(to: string, subject: string, html: string, from = "NST Venture OS <ops@newtonschool.co>") {
  const lk = process.env.LOVABLE_API_KEY;
  const rk = process.env.RESEND_API_KEY;
  if (!lk || !rk) return { ok: false, reason: "missing-resend-keys" };
  const res = await fetch(`${GATEWAY}/resend/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lk}`,
      "X-Connection-Api-Key": rk,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return { ok: res.ok, reason: res.ok ? "sent" : `${res.status}:${await res.text()}` };
}

async function aiSummarize(prompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return "";
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a concise operations analyst for a startup accelerator. Reply in plain text, <120 words." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return "";
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// ---------- Agents ----------

async function onboardingNudger(supabase: any, ctx: RunContext) {
  const { data: pending } = await supabase
    .from("onboarding_questionnaires")
    .select("founder_id, submitted_at, founders:founder_id (founder_name, startup_name, email)")
    .is("submitted_at", null);
  for (const row of pending ?? []) {
    const f = row.founders;
    if (!f?.email) { log(ctx, "warn", "no email", row.founder_id); continue; }
    const { data: docs } = await supabase
      .from("onboarding_documents").select("section").eq("founder_id", row.founder_id);
    const have = new Set((docs ?? []).map((d: any) => d.section));
    const need = ["product", "customers", "revenue", "traction", "team"].filter(s => !have.has(s));
    if (need.length === 0) continue;
    const r = await resendEmail(
      f.email,
      `Onboarding: ${need.length} evidence section${need.length > 1 ? "s" : ""} still pending`,
      `<p>Hi ${f.founder_name ?? "founder"},</p>
       <p>Your onboarding for <b>${f.startup_name}</b> is not yet submittable. Missing evidence in: <b>${need.join(", ")}</b>.</p>
       <p>Upload the docs in the Onboarding Q tab and hit Submit when done.</p>`
    );
    log(ctx, r.ok ? "info" : "warn", `nudged ${f.email}: ${r.reason}`, row.founder_id);
    ctx.processed++;
  }
}

async function transcriptRouter(supabase: any, ctx: RunContext) {
  const { data: recent } = await supabase
    .from("meeting_transcripts")
    .select("id, founder_id, ingested_at, mentor_verified, founders:founder_id (startup_name)")
    .eq("mentor_verified", false)
    .gte("ingested_at", new Date(Date.now() - 24 * 3600_000).toISOString())
    .order("ingested_at", { ascending: false })
    .limit(50);
  if (!recent?.length) return;
  const lines = recent.map((r: any) => `• ${r.founders?.startup_name ?? r.founder_id} — awaits mentor verification`).join("\n");
  const r = await slackPost(`:memo: *Transcripts awaiting mentor review* (${recent.length})\n${lines}`);
  log(ctx, r.ok ? "info" : "error", `slack: ${r.reason}`);
  ctx.processed = recent.length;
}

async function dossierRecompiler(supabase: any, ctx: RunContext) {
  // Founders whose latest questionnaire/submission/transcript is newer than their dossier.
  const { data: founders } = await supabase.from("founders").select("id, startup_name").limit(200);
  for (const f of founders ?? []) {
    const [{ data: d }, { data: q }, { data: t }, { data: s }] = await Promise.all([
      supabase.from("startup_dossiers").select("generated_at").eq("founder_id", f.id).maybeSingle(),
      supabase.from("onboarding_questionnaires").select("updated_at, submitted_at").eq("founder_id", f.id).maybeSingle(),
      supabase.from("meeting_transcripts").select("ingested_at").eq("founder_id", f.id).order("ingested_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("biweekly_submissions").select("submitted_at").eq("founder_id", f.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const dossierAt = d?.generated_at ? new Date(d.generated_at).getTime() : 0;
    const latest = Math.max(
      q?.submitted_at ? new Date(q.submitted_at).getTime() : 0,
      t?.ingested_at ? new Date(t.ingested_at).getTime() : 0,
      s?.submitted_at ? new Date(s.submitted_at).getTime() : 0,
    );
    if (latest > dossierAt && latest > 0) {
      log(ctx, "info", `stale dossier for ${f.startup_name}`, f.id);
      ctx.processed++;
      // We flag; actual AI compile happens on-demand from UI to keep this bot cheap.
    }
  }
}

async function riskSentinel(supabase: any, ctx: RunContext) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: rows } = await supabase
    .from("meeting_transcripts")
    .select("id, founder_id, content, ingested_at, founders:founder_id (startup_name)")
    .gte("ingested_at", since)
    .limit(20);
  for (const t of rows ?? []) {
    const summary = await aiSummarize(
      `Scan this transcript for red flags: runway <3mo, team conflict, legal, churn spike, ethical concern. If none, reply "NO_RISK". Otherwise list the flags briefly.\n\n${(t.content ?? "").slice(0, 8000)}`
    );
    if (!summary || /NO_RISK/i.test(summary)) continue;
    await slackPost(`:rotating_light: *Risk flagged* — ${t.founders?.startup_name}\n${summary}`);
    await supabase.from("academic_alerts").insert({
      founder_id: t.founder_id, kind: "risk_sentinel", reason: summary.slice(0, 500),
    });
    log(ctx, "warn", `risk flagged`, t.founder_id);
    ctx.processed++;
  }
}

async function cycleScheduler(supabase: any, ctx: RunContext) {
  // Simple heuristic: ensure the next 2 biweekly cycles exist for each founder.
  const { data: founders } = await supabase.from("founders").select("id, startup_name").limit(200);
  for (const f of founders ?? []) {
    const { data: last } = await supabase
      .from("biweekly_submissions").select("cycle_number, period_end")
      .eq("founder_id", f.id).order("cycle_number", { ascending: false }).limit(1).maybeSingle();
    const nextNum = (last?.cycle_number ?? 0) + 1;
    const start = last?.period_end ? new Date(last.period_end) : new Date();
    if (last?.period_end) start.setDate(start.getDate() + 1);
    const end = new Date(start); end.setDate(end.getDate() + 13);
    const { error } = await supabase.from("biweekly_submissions").insert({
      founder_id: f.id, cycle_number: nextNum,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
    });
    if (!error) { log(ctx, "info", `cycle ${nextNum} scheduled`, f.id); ctx.processed++; }
  }
}

async function weeklyDigest(supabase: any, ctx: RunContext) {
  const { data: leadership } = await supabase
    .from("user_roles").select("user_id, profiles:user_id(email, full_name)").in("role", ["super_admin", "faculty"]);
  const { data: alerts } = await supabase
    .from("academic_alerts").select("id, kind, reason, opened_at, founders:founder_id(startup_name)")
    .eq("status", "open").order("opened_at", { ascending: false }).limit(20);
  const { data: founders } = await supabase.from("founders").select("id, lifecycle_stage, lifecycle_status");
  const stages = (founders ?? []).reduce((acc: any, f: any) => { acc[f.lifecycle_stage ?? "unknown"] = (acc[f.lifecycle_stage ?? "unknown"] ?? 0) + 1; return acc; }, {});
  const html = `
    <h2>NST Venture OS — Weekly Digest</h2>
    <p><b>Cohort stages:</b> ${Object.entries(stages).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
    <h3>Open alerts (${alerts?.length ?? 0})</h3>
    <ul>${(alerts ?? []).map((a: any) => `<li><b>${a.founders?.startup_name}</b> — ${a.kind}: ${a.reason}</li>`).join("")}</ul>`;
  for (const l of leadership ?? []) {
    const em = l.profiles?.email;
    if (!em) continue;
    const r = await resendEmail(em, "NST Venture OS — Weekly Digest", html);
    log(ctx, r.ok ? "info" : "warn", `digest → ${em}: ${r.reason}`);
    ctx.processed++;
  }
}

const REGISTRY: Record<string, (s: any, c: RunContext) => Promise<void>> = {
  onboarding_nudger: onboardingNudger,
  cycle_scheduler: cycleScheduler,
  transcript_router: transcriptRouter,
  dossier_recompiler: dossierRecompiler,
  risk_sentinel: riskSentinel,
  weekly_digest: weeklyDigest,
};

export async function runAgent(slug: string, triggeredBy: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const fn = REGISTRY[slug];
  if (!fn) throw new Error(`Unknown agent: ${slug}`);
  const ctx: RunContext = { slug, triggeredBy, details: [], processed: 0 };
  const { data: runRow } = await supabaseAdmin
    .from("agent_runs")
    .insert({ agent_slug: slug, triggered_by: triggeredBy, status: "running" })
    .select("id").single();
  const runId = runRow?.id;
  let status = "success", errMsg: string | null = null;
  try {
    await fn(supabaseAdmin, ctx);
  } catch (e: any) {
    status = "error";
    errMsg = e?.message ?? String(e);
  }
  const summary = `${ctx.processed} item(s) processed`;
  if (runId) {
    await supabaseAdmin.from("agent_runs").update({
      status, finished_at: new Date().toISOString(),
      items_processed: ctx.processed, summary, details: ctx.details, error: errMsg,
    }).eq("id", runId);
  }
  await supabaseAdmin.from("agent_configs").update({
    last_run_at: new Date().toISOString(), last_status: status,
  }).eq("slug", slug);
  return { ok: status === "success", slug, processed: ctx.processed, error: errMsg };
}

export const ALL_AGENT_SLUGS = Object.keys(REGISTRY);
