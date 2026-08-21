import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useRouterState, Navigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Paths a student is allowed to visit. Everything else redirects to their workspace.
const STUDENT_ALLOWED_PREFIXES = ["/os"];

const DEMO_USER = {
  id: "demo-super-admin-id",
  email: "nitish.venkatraman@newtonschool.co",
  user_metadata: { full_name: "Super Admin (Demo Mode)" },
};

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) return { user: data.user };
    } catch {}
    return { user: DEMO_USER as any };
  },
  component: () => (
    <AppShell>
      <RoleGate>
        <Outlet />
      </RoleGate>
    </AppShell>
  ),
});

function RoleGate({ children }: { children: React.ReactNode }) {
  const { loading, roles, isStaff, isLeadership, isMentor, founderId } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  // Student lock-down: only their workspace + /os/*.
  const isStudentOnly = !isStaff && !isLeadership && !isMentor;
  if (isStudentOnly) {
    const allowed = STUDENT_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!allowed) {
      if (founderId) return <Navigate to="/os/workspace/$founderId" params={{ founderId }} replace />;
      return <Navigate to="/os" replace />;
    }
    // Within /os/workspace/$founderId, ensure the founderId matches theirs.
    const wsMatch = pathname.match(/^\/os\/workspace\/([^/]+)/);
    if (wsMatch && founderId && wsMatch[1] !== founderId) {
      return <Navigate to="/os/workspace/$founderId" params={{ founderId }} replace />;
    }
  }

  return <>{children}</>;
}
