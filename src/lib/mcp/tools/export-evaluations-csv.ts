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

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default defineTool({
  name: "export_evaluations_csv",
  title: "Export evaluations to CSV",
  description:
    "Export faculty evaluations as CSV, filtered by campus, lifecycle stage, date range (decided_at), or cycle-number window. RLS applies — students only see their own approved reviews; staff see everything. Result is returned as CSV text.",
  inputSchema: {
    campus: z.string().optional().describe("Filter to founders on this campus."),
    stage: z
      .enum([
        "idea",
        "discovery",
        "validation",
        "mvp",
        "pilot",
        "revenue",
        "growth",
        "fundraising",
      ])
      .optional()
      .describe("Filter to founders in this lifecycle stage."),
    date_from: z.string().optional().describe("ISO date (inclusive) lower bound on decided_at."),
    date_to: z.string().optional().describe("ISO date (inclusive) upper bound on decided_at."),
    cycle_from: z.number().int().min(1).max(13).optional().describe("Lower bound on cycle_number."),
    cycle_to: z.number().int().min(1).max(13).optional().describe("Upper bound on cycle_number."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);

    let q = supabase
      .from("faculty_reviews")
      .select(
        "id, cycle_number, execution_score, customer_score, business_score, behavior_score, total_score, status, decision, comments, recommendations, evidence_refs, decided_at, created_at, founder_id, reviewer_id, founders!inner(startup_name, founder_name, campus, lifecycle_stage)",
      )
      .order("decided_at", { ascending: false });

    if (input.campus) q = q.eq("founders.campus", input.campus);
    if (input.stage) q = q.eq("founders.lifecycle_stage", input.stage);
    if (input.date_from) q = q.gte("decided_at", input.date_from);
    if (input.date_to) q = q.lte("decided_at", input.date_to);
    if (input.cycle_from !== undefined) q = q.gte("cycle_number", input.cycle_from);
    if (input.cycle_to !== undefined) q = q.lte("cycle_number", input.cycle_to);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const headers = [
      "id",
      "startup_name",
      "founder_name",
      "campus",
      "lifecycle_stage",
      "cycle_number",
      "execution_score",
      "customer_score",
      "business_score",
      "behavior_score",
      "total_score",
      "status",
      "decision",
      "comments",
      "recommendations",
      "evidence_refs",
      "decided_at",
      "reviewer_id",
    ];
    const lines = [headers.join(",")];
    for (const r of data ?? []) {
      const f: any = (r as any).founders ?? {};
      lines.push(
        [
          r.id,
          f.startup_name,
          f.founder_name,
          f.campus,
          f.lifecycle_stage,
          r.cycle_number,
          r.execution_score,
          r.customer_score,
          r.business_score,
          r.behavior_score,
          r.total_score,
          r.status,
          r.decision,
          r.comments,
          (r as any).recommendations,
          (r as any).evidence_refs,
          r.decided_at,
          r.reviewer_id,
        ]
          .map(csvEscape)
          .join(","),
      );
    }
    const csv = lines.join("\n");
    return {
      content: [{ type: "text", text: csv }],
      structuredContent: { row_count: data?.length ?? 0, csv },
    };
  },
});
