import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type EvalInput = { packetId: string };

const SYSTEM_PROMPT = `You are an evaluator for the NST Entrepreneurship Track.
You read a founder's monthly submission packet + evidence titles + KPI snapshot,
then return a strict JSON object with these keys:

{
  "strengths": string,
  "weaknesses": string,
  "risks": string,
  "missing": string,
  "suggested_execution": integer 0-40,
  "suggested_customer": integer 0-25,
  "suggested_business": integer 0-20,
  "suggested_behavior": integer 0-15,
  "suggested_total": integer 0-100,
  "suggested_status": "green" | "yellow" | "red",
  "faculty_summary": string
}

Green: total >= 70 AND no pillar below 50% of its weight.
Yellow: total >= 50.
Red: total < 50.

Be honest, evidence-driven, and concise. Do not fabricate scores when there is
no evidence — instead score conservatively and list what's missing.

Return ONLY raw JSON. No prose, no code fences.`;

export const evaluateSubmissionPacket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): EvalInput => {
    const i = input as EvalInput;
    if (!i?.packetId) throw new Error("packetId required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Staff-only: prevent students from burning AI credits via direct RPC.
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) throw new Error("Unable to verify role");
    const isStaff = (roleRows ?? []).some((r: any) =>
      ["super_admin", "faculty"].includes(r.role)
    );
    if (!isStaff) throw new Error("Unauthorized: staff only");

    const { data: packet, error: pErr } = await supabase
      .from("submission_packets")
      .select("*")
      .eq("id", data.packetId)
      .single();
    if (pErr || !packet) throw new Error("Packet not found");

    const [{ data: evidence }, { data: kpi }, { data: weekly }] = await Promise.all([
      supabase.from("evidence_items").select("category, title, kind, month").eq("founder_id", packet.founder_id),
      supabase.from("kpi_snapshots").select("*").eq("founder_id", packet.founder_id).eq("month", packet.month).maybeSingle(),
      supabase.from("weekly_trackers").select("*").eq("founder_id", packet.founder_id),
    ]);

    const userMsg = `MONTHLY PACKET (Month ${packet.month})
Summary: ${packet.summary}
What worked: ${packet.what_worked}
What failed: ${packet.what_failed}
What changed: ${packet.what_changed}
Assumptions invalidated: ${packet.assumptions_invalidated}
Next steps: ${packet.next_steps}

EVIDENCE (${evidence?.length ?? 0} items):
${(evidence ?? []).map((e: any) => `- [${e.category}] ${e.title} (${e.kind}${e.month ? `, M${e.month}` : ""})`).join("\n") || "(none)"}

WEEKLY ROLLUP (${weekly?.length ?? 0} weeks):
${(weekly ?? []).map((w: any) => `- ${w.week_start}: ${w.hours_worked}h, ${w.meetings} mtgs, ${w.customers_spoken} customers, ${w.features_shipped} feats, ₹${w.revenue}, ${w.users_acquired} users, ${w.experiments} experiments`).join("\n") || "(none)"}

MONTH KPI SNAPSHOT:
${kpi ? JSON.stringify(kpi) : "(none)"}`;

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit. Retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up the workspace.");
    if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { throw new Error("AI returned invalid JSON"); }

    const { data: row, error: insErr } = await supabase
      .from("ai_evaluations")
      .insert({
        packet_id: packet.id,
        strengths: parsed.strengths ?? null,
        weaknesses: parsed.weaknesses ?? null,
        risks: parsed.risks ?? null,
        missing: parsed.missing ?? null,
        suggested_execution: parsed.suggested_execution ?? null,
        suggested_customer: parsed.suggested_customer ?? null,
        suggested_business: parsed.suggested_business ?? null,
        suggested_behavior: parsed.suggested_behavior ?? null,
        suggested_total: parsed.suggested_total ?? null,
        suggested_status: parsed.suggested_status ?? null,
        faculty_summary: parsed.faculty_summary ?? null,
        raw_json: parsed,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);

    return { ok: true, ai: row };
  });
