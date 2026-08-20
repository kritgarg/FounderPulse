import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: configs }, { data: runs }] = await Promise.all([
      supabase.from("agent_configs").select("*").order("name"),
      supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(50),
    ]);
    return { configs: configs ?? [], runs: runs ?? [] };
  });

export const runAgentNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { slug: string };
    if (!i?.slug) throw new Error("slug required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isStaff = (roles ?? []).some((r: any) => ["super_admin", "faculty"].includes(r.role));
    if (!isStaff) throw new Error("Unauthorized: staff only");
    const { runAgent } = await import("./runner.server");
    return await runAgent(data.slug, `manual:${userId}`);
  });

export const toggleAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { slug: string; enabled: boolean };
    if (!i?.slug) throw new Error("slug required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "super_admin");
    if (!isAdmin) throw new Error("Unauthorized: super admin only");
    const { error } = await supabase.from("agent_configs").update({ enabled: data.enabled }).eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
