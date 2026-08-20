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
  name: "submit_mentor_observation",
  title: "Submit mentor observation",
  description:
    "Create or update a mentor's bi-weekly observation for a founder+cycle. Links the observation to specific evidence items (by evidence_items.id) or URLs the mentor reviewed. RLS restricts writes to staff or users with the mentor role. Upserts on (founder_id, cycle_number).",
  inputSchema: {
    founder_id: z.string().uuid().describe("Founder id being observed."),
    cycle_number: z.number().int().min(1).max(13).describe("Bi-weekly cycle number (1-13)."),
    observation: z.string().min(1).describe("Main observation / narrative for this cycle."),
    strengths: z.string().optional().describe("What is going well."),
    concerns: z.string().optional().describe("Risks or concerns to flag."),
    action_items: z.string().optional().describe("Recommended next actions for the founder."),
    evidence_reviewed: z
      .array(z.string())
      .optional()
      .describe("List of evidence_items.id UUIDs or evidence URLs the mentor reviewed."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);
    const authorId = ctx.getUserId()!;

    // Server-side role check: only staff or mentors can write observations.
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", authorId);
    const roleList = (roles ?? []).map((r: any) => r.role);
    const allowed = roleList.includes("super_admin") || roleList.includes("faculty") || roleList.includes("mentor");
    if (!allowed) {
      return { content: [{ type: "text", text: "Forbidden: mentor or faculty role required." }], isError: true };
    }

    const existing = await supabase
      .from("biweekly_mentor_observations")
      .select("id")
      .eq("founder_id", input.founder_id)
      .eq("cycle_number", input.cycle_number)
      .maybeSingle();

    const payload = {
      founder_id: input.founder_id,
      cycle_number: input.cycle_number,
      author_id: authorId,
      observation: input.observation,
      strengths: input.strengths ?? null,
      concerns: input.concerns ?? null,
      action_items: input.action_items ?? null,
      evidence_reviewed: (input.evidence_reviewed ?? []) as unknown as Database["public"]["Tables"]["biweekly_mentor_observations"]["Insert"]["evidence_reviewed"],
    };

    const { data, error } = existing.data
      ? await supabase
          .from("biweekly_mentor_observations")
          .update(payload)
          .eq("id", existing.data.id)
          .select()
          .single()
      : await supabase
          .from("biweekly_mentor_observations")
          .insert(payload)
          .select()
          .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { observation: data },
    };
  },
});
