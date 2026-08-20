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
  name: "get_founder_evaluations",
  title: "Get founder evaluations",
  description:
    "Return the latest faculty evaluations (scores, status, decision, comments, recommendations) for a given founder. If founder_id is omitted, uses the signed-in user's linked founder profile. RLS enforces access.",
  inputSchema: {
    founder_id: z
      .string()
      .uuid()
      .optional()
      .describe("Founder id. Defaults to the signed-in user's founder."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = client(ctx.getToken()!);
    let founderId = input.founder_id;
    if (!founderId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("founder_id")
        .eq("id", ctx.getUserId()!)
        .maybeSingle();
      founderId = (profile as any)?.founder_id ?? undefined;
      if (!founderId) {
        return {
          content: [
            { type: "text", text: "No founder linked to this account. Pass founder_id explicitly." },
          ],
          isError: true,
        };
      }
    }

    const { data, error } = await supabase
      .from("faculty_reviews")
      .select(
        "id, cycle_number, execution_score, customer_score, business_score, behavior_score, total_score, status, decision, comments, recommendations, evidence_refs, decided_at, reviewer_id",
      )
      .eq("founder_id", founderId)
      .order("decided_at", { ascending: false, nullsFirst: false })
      .limit(input.limit ?? 10);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { founder_id: founderId, evaluations: data ?? [] },
    };
  },
});
