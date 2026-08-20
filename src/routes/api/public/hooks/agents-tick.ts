import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/agents-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const only = url.searchParams.get("slug");
        const { runAgent, ALL_AGENT_SLUGS } = await import("@/lib/agents/runner.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: configs } = await supabaseAdmin
          .from("agent_configs").select("slug, enabled").eq("enabled", true);
        const enabled = new Set((configs ?? []).map((c: any) => c.slug));
        const slugs = only
          ? [only].filter((s) => enabled.has(s))
          : ALL_AGENT_SLUGS.filter((s) => enabled.has(s));
        const results: any[] = [];
        for (const s of slugs) {
          try { results.push(await runAgent(s, "cron")); }
          catch (e: any) { results.push({ slug: s, ok: false, error: e?.message }); }
        }
        return new Response(JSON.stringify({ ok: true, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response("agents-tick alive", { status: 200 }),
    },
  },
});
