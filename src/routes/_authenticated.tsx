import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useRouterState, Navigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Paths a student is allowed to visit. Everything else redirects to their workspace.
const STUDENT_ALLOWED_PREFIXES = ["/os"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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

  // No role at all → faculty awaiting approval, or unknown account.
  if (roles.length === 0) {
    return (
      <Card className="border-border/70 shadow-none max-w-xl mx-auto mt-12">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <div className="font-display text-xl">Awaiting approval</div>
          <p className="text-sm text-muted-foreground">
            Your account was created and a request has been sent to the program lead
            (<strong>nitish.venkatraman@newtonschool.co</strong>) for review. You will get access
            once approved.
          </p>
          <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  }

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
