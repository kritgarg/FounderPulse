import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CYCLES, computeCycleWindow } from "../checklists";

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
  name: "get_current_cycle_window",
  title: "Get current bi-weekly cycle window",
  description:
    "For the signed-in founder, return the current bi-weekly cycle number, its start/end dates, submit deadline (period_end + 3-day grace), and any past/future windows relative to their intake date. Requires the user to be linked to a founder profile.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
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
      return { content: [{ type: "text", text: "No founder linked to this account." }], isError: true };
    }
    const { data: founder, error } = await supabase
      .from("founders")
      .select("id, startup_name, intake_completed_at, created_at")
      .eq("id", founderId)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const intakeISO = (founder as any)?.intake_completed_at ?? (founder as any)?.created_at;
    if (!intakeISO) {
      return {
        content: [{ type: "text", text: "Complete Day-1 intake first — no reference date for cycles." }],
        isError: true,
      };
    }

    const today = new Date();
    const windows = Array.from({ length: CYCLES }, (_, i) => computeCycleWindow(intakeISO, i + 1));
    const current = windows.find(w => today <= new Date(w.deadline + "T23:59:59Z")) ?? windows[windows.length - 1];
    const enriched = windows.map(w => {
      const deadlineDate = new Date(w.deadline + "T23:59:59Z");
      const status = today > deadlineDate ? "closed" : today >= new Date(w.period_start) ? "open" : "upcoming";
      return { ...w, status };
    });

    const payload = {
      founder_id: founderId,
      startup_name: (founder as any)?.startup_name,
      intake_date: intakeISO,
      current_cycle: current.cycle_number,
      current_window: current,
      all_windows: enriched,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
