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
  name: "upsert_faculty_evaluation",
  title: "Create or update faculty evaluation",
  description:
    "Create or update a faculty evaluation for a founder's bi-weekly submission. Scores are on the standard NST rubric: execution (0-40), customer (0-25), business (0-20), behavior (0-15). Includes evidence references (evidence_items ids or URLs the evaluator cited) and free-text recommendations. Only staff (faculty/super_admin) can write; the trigger auto-computes total_score and status (green/yellow/red).",
  inputSchema: {
    packet_id: z
      .string()
      .uuid()
      .describe("The biweekly_submissions.id (or submission_packets.id) this evaluation refers to."),
    founder_id: z.string().uuid().describe("Founder id being evaluated."),
    cycle_number: z.number().int().min(1).max(13).optional().describe("Bi-weekly cycle number."),
    execution_score: z.number().int().min(0).max(40).describe("Execution pillar (0-40)."),
    customer_score: z.number().int().min(0).max(25).describe("Customer pillar (0-25)."),
    business_score: z.number().int().min(0).max(20).describe("Business pillar (0-20)."),
    behavior_score: z.number().int().min(0).max(15).describe("Behavior pillar (0-15)."),
    decision: z
      .enum(["approve", "reject", "edit", "resubmit"])
      .describe("Faculty decision on this evaluation."),
    comments: z.string().optional().describe("Free-text faculty comments."),
    recommendations: z
      .string()
      .optional()
      .describe("Actionable recommendations for the founder."),
    evidence_refs: z
      .array(z.string())
      .optional()
      .describe("Evidence item ids (uuid) or URLs the evaluator cited."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);
    const reviewerId = ctx.getUserId()!;

    // Server-side role check: only staff (faculty/super_admin) can write evaluations.
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", reviewerId);
    const roleList = (roles ?? []).map((r: any) => r.role);
    const isStaff = roleList.includes("super_admin") || roleList.includes("faculty");
    if (!isStaff) {
      return { content: [{ type: "text", text: "Forbidden: faculty role required to submit evaluations." }], isError: true };
    }


    const existing = await supabase
      .from("faculty_reviews")
      .select("id")
      .eq("packet_id", input.packet_id)
      .eq("reviewer_id", reviewerId)
      .maybeSingle();

    const payload: any = {
      packet_id: input.packet_id,
      founder_id: input.founder_id,
      reviewer_id: reviewerId,
      cycle_number: input.cycle_number ?? null,
      execution_score: input.execution_score,
      customer_score: input.customer_score,
      business_score: input.business_score,
      behavior_score: input.behavior_score,
      decision: input.decision,
      comments: input.comments ?? null,
      recommendations: input.recommendations ?? null,
      evidence_refs: input.evidence_refs ?? [],
      decided_at: new Date().toISOString(),
    };

    const { data, error } = existing.data
      ? await supabase
          .from("faculty_reviews")
          .update(payload)
          .eq("id", existing.data.id)
          .select()
          .single()
      : await supabase.from("faculty_reviews").insert(payload).select().single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { evaluation: data },
    };
  },
});
