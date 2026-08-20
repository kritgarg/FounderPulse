import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function client(token: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

async function callLovableAI(prompt: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are the NST Startup Track review board. Given a founder's bi-weekly progress, evaluations, and mentor observations, produce a concise, honest review board summary. Return strict JSON with keys: strengths (string[]), concerns (string[]), recommendation (one of: continue, coach, warn, escalate_to_board), rationale (string, <= 200 words).",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); } catch { return { rationale: raw, strengths: [], concerns: [], recommendation: "coach" }; }
}

export default defineTool({
  name: "generate_review_board_summary",
  title: "Generate startup review board summary",
  description:
    "Produce a concise review board summary (strengths, concerns, recommendation, rationale) for a founder across a selected cycle window or date range. Pulls the founder's bi-weekly submissions, faculty evaluations, and mentor observations under RLS, then asks the NST review-board LLM to synthesize. Staff-only.",
  inputSchema: {
    founder_id: z.string().uuid().describe("Founder to summarize."),
    cycle_from: z.number().int().min(1).max(13).optional(),
    cycle_to: z.number().int().min(1).max(13).optional(),
    date_from: z.string().optional().describe("ISO date lower bound (period_end)."),
    date_to: z.string().optional().describe("ISO date upper bound (period_end)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);

    // Server-side authorization: staff only.
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", ctx.getUserId()!);
    const roleList = (roles ?? []).map((r: any) => r.role);
    const isStaff = roleList.includes("super_admin") || roleList.includes("faculty");
    if (!isStaff) {
      return { content: [{ type: "text", text: "Forbidden: review board summaries are staff-only." }], isError: true };
    }

    let subs = supabase.from("biweekly_submissions").select("*").eq("founder_id", input.founder_id);
    if (input.cycle_from !== undefined) subs = subs.gte("cycle_number", input.cycle_from);
    if (input.cycle_to !== undefined) subs = subs.lte("cycle_number", input.cycle_to);
    if (input.date_from) subs = subs.gte("period_end", input.date_from);
    if (input.date_to) subs = subs.lte("period_end", input.date_to);

    const [{ data: founder }, { data: submissions }, { data: reviews }, { data: obs }] = await Promise.all([
      supabase.from("founders").select("startup_name, founder_name, lifecycle_stage, lifecycle_status, campus").eq("id", input.founder_id).maybeSingle(),
      subs.order("cycle_number"),
      supabase.from("faculty_reviews").select("cycle_number, execution_score, customer_score, business_score, behavior_score, total_score, status, decision, comments, recommendations, decided_at").eq("founder_id", input.founder_id).order("decided_at", { ascending: false }).limit(20),
      supabase.from("biweekly_mentor_observations").select("cycle_number, observation, strengths, concerns, action_items, updated_at").eq("founder_id", input.founder_id).order("cycle_number"),
    ]);

    if (!founder) {
      return { content: [{ type: "text", text: "Founder not found or not accessible." }], isError: true };
    }

    const prompt = JSON.stringify({
      founder,
      window: {
        cycle_from: input.cycle_from,
        cycle_to: input.cycle_to,
        date_from: input.date_from,
        date_to: input.date_to,
      },
      submissions: submissions ?? [],
      faculty_reviews: reviews ?? [],
      mentor_observations: obs ?? [],
    });

    let summary: any;
    try {
      summary = await callLovableAI(prompt);
    } catch (e: any) {
      return { content: [{ type: "text", text: `AI error: ${e?.message ?? e}` }], isError: true };
    }

    const payload = {
      founder_id: input.founder_id,
      founder,
      window: { cycle_from: input.cycle_from, cycle_to: input.cycle_to, date_from: input.date_from, date_to: input.date_to },
      strengths: summary.strengths ?? [],
      concerns: summary.concerns ?? [],
      recommendation: summary.recommendation ?? "coach",
      rationale: summary.rationale ?? "",
      source_counts: {
        submissions: submissions?.length ?? 0,
        faculty_reviews: reviews?.length ?? 0,
        mentor_observations: obs?.length ?? 0,
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
