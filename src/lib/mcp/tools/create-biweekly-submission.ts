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

export default defineTool({
  name: "create_biweekly_submission",
  title: "Create bi-weekly submission",
  description:
    "Let the signed-in founder create (or update-and-submit) a bi-weekly submission for a given cycle. Attach evidence via a list of URLs. RLS enforces founder ownership; the biweekly lock trigger rejects late submissions and edits after the deadline.",
  inputSchema: {
    cycle_number: z.number().int().min(1).max(13).describe("Bi-weekly cycle number (1-13)."),
    period_start: z.string().describe("Cycle start date (YYYY-MM-DD)."),
    period_end: z.string().describe("Cycle end date (YYYY-MM-DD)."),
    progress_summary: z.string().min(1).describe("What was accomplished this cycle."),
    wins: z.string().optional(),
    blockers: z.string().optional(),
    ask_for_help: z.string().optional(),
    goals_next_cycle: z.string().optional(),
    hours_worked: z.number().optional(),
    customer_interviews: z.number().int().optional(),
    features_shipped: z.number().int().optional(),
    experiments_run: z.number().int().optional(),
    revenue: z.number().optional(),
    users_acquired: z.number().int().optional(),
    mentor_meeting_date: z.string().optional().describe("YYYY-MM-DD."),
    mentor_meeting_notes: z.string().optional(),
    evidence_links: z
      .array(z.string())
      .optional()
      .describe("List of evidence URLs (demo videos, docs, dashboards, etc.)."),
    submit: z
      .boolean()
      .optional()
      .describe("If true, mark submitted_at=now(). If false/omitted, saves as draft."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);
    const { data: profile } = await supabase
      .from("profiles")
      .select("founder_id")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    const founderId = (profile as any)?.founder_id;
    if (!founderId) {
      return {
        content: [{ type: "text", text: "No founder linked to this account." }],
        isError: true,
      };
    }

    const existing = await supabase
      .from("biweekly_submissions")
      .select("id, submitted_at")
      .eq("founder_id", founderId)
      .eq("cycle_number", input.cycle_number)
      .maybeSingle();

    const payload: any = {
      founder_id: founderId,
      cycle_number: input.cycle_number,
      period_start: input.period_start,
      period_end: input.period_end,
      progress_summary: input.progress_summary,
      wins: input.wins ?? null,
      blockers: input.blockers ?? null,
      ask_for_help: input.ask_for_help ?? null,
      goals_next_cycle: input.goals_next_cycle ?? null,
      hours_worked: input.hours_worked ?? null,
      customer_interviews: input.customer_interviews ?? null,
      features_shipped: input.features_shipped ?? null,
      experiments_run: input.experiments_run ?? null,
      revenue: input.revenue ?? null,
      users_acquired: input.users_acquired ?? null,
      mentor_meeting_date: input.mentor_meeting_date ?? null,
      mentor_meeting_notes: input.mentor_meeting_notes ?? null,
      evidence_links: input.evidence_links ?? [],
    };
    if (input.submit) payload.submitted_at = new Date().toISOString();

    const { data, error } = existing.data
      ? await supabase
          .from("biweekly_submissions")
          .update(payload)
          .eq("id", existing.data.id)
          .select()
          .single()
      : await supabase.from("biweekly_submissions").insert(payload).select().single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { submission: data },
    };
  },
});
