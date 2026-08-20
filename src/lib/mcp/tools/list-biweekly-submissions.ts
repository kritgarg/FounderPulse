import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export default defineTool({
  name: "list_biweekly_submissions",
  title: "List bi-weekly submissions",
  description:
    "List bi-weekly submissions for a founder in the NST Startup Track. RLS enforces access (student sees own, staff sees all).",
  inputSchema: {
    founder_id: z.string().uuid().describe("Founder id whose submissions to list."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ founder_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase
      .from("biweekly_submissions")
      .select("id, cycle_number, period_start, period_end, submitted_at, progress_summary, hours_worked, customer_interviews, revenue, users_acquired")
      .eq("founder_id", founder_id)
      .order("cycle_number", { ascending: true });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { submissions: data ?? [] },
    };
  },
});
