import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { CYCLES, GRACE_DAYS } from "../checklists";

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
  name: "list_biweekly_submissions_scoped",
  title: "List bi-weekly submissions (role-scoped, with lock & missed flags)",
  description:
    "List bi-weekly submissions the signed-in user is allowed to see. Students see only their own; staff (faculty/super_admin) and mentors see all. Each row is enriched with is_submitted, is_draft, is_locked (past deadline or already submitted), is_missed (deadline passed with no submitted_at), and deadline date. Filter by founder_id, campus, lifecycle stage, or cycle window.",
  inputSchema: {
    founder_id: z.string().uuid().optional().describe("Restrict to one founder."),
    campus: z.string().optional().describe("Filter by founder campus (staff-visible only)."),
    stage: z
      .enum(["idea","discovery","validation","mvp","pilot","revenue","growth","fundraising"])
      .optional()
      .describe("Filter by lifecycle stage."),
    cycle_from: z.number().int().min(1).max(13).optional(),
    cycle_to: z.number().int().min(1).max(13).optional(),
    status: z
      .enum(["submitted", "draft", "locked", "missed", "open"])
      .optional()
      .describe("Filter by computed lifecycle state."),
    limit: z.number().int().min(1).max(500).optional().describe("Max rows (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);

    let q = supabase
      .from("biweekly_submissions")
      .select(
        "id, founder_id, cycle_number, period_start, period_end, submitted_at, progress_summary, wins, blockers, evidence_links, updated_at, founders!inner(startup_name, founder_name, campus, lifecycle_stage)",
      )
      .order("cycle_number", { ascending: true });

    if (input.founder_id) q = q.eq("founder_id", input.founder_id);
    if (input.campus) q = q.eq("founders.campus", input.campus);
    if (input.stage) q = q.eq("founders.lifecycle_stage", input.stage);
    if (input.cycle_from !== undefined) q = q.gte("cycle_number", input.cycle_from);
    if (input.cycle_to !== undefined) q = q.lte("cycle_number", input.cycle_to);
    q = q.limit(input.limit ?? 100);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const now = new Date();
    const rows = (data ?? []).map((r: any) => {
      const deadline = new Date(r.period_end);
      deadline.setDate(deadline.getDate() + GRACE_DAYS);
      const is_submitted = !!r.submitted_at;
      const past_deadline = now > deadline;
      const is_locked = is_submitted || past_deadline;
      const is_missed = !is_submitted && past_deadline;
      const is_draft = !is_submitted && !past_deadline;
      let state: "submitted" | "draft" | "locked" | "missed" | "open" = "open";
      if (is_submitted) state = "submitted";
      else if (is_missed) state = "missed";
      else if (is_draft) state = "draft";
      return {
        ...r,
        deadline: deadline.toISOString().slice(0, 10),
        is_submitted,
        is_locked,
        is_missed,
        is_draft,
        state,
      };
    });

    const filtered = input.status ? rows.filter((r) => r.state === input.status) : rows;
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
      structuredContent: { total_cycles: CYCLES, count: filtered.length, submissions: filtered },
    };
  },
});
