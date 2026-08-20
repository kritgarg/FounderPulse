import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in user's id, email, and roles in the NST Startup Track.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
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
    const userId = ctx.getUserId();
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId!),
      supabase.from("profiles").select("full_name, founder_id").eq("id", userId!).maybeSingle(),
    ]);
    const payload = {
      user_id: userId,
      email: ctx.getUserEmail(),
      full_name: (profile as any)?.full_name ?? null,
      founder_id: (profile as any)?.founder_id ?? null,
      roles: (roles ?? []).map((r: any) => r.role),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
