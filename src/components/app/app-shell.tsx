import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, ShieldCheck, LogOut, BookOpen, Sparkles, Crown, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, isStaff, isAdmin, isLeadership, isMentor, founderId } = useAuth();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const initials = (user?.email?.[0] ?? "?").toUpperCase();
  const hasFullAccess = isStaff || isLeadership || isMentor;
  const isStudentOnly = !hasFullAccess && roles.length > 0;
  const homeTo = isStudentOnly ? "/os" : "/dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-[260px] flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 pt-7 pb-6">
          <Link to={homeTo} className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-md bg-sidebar-foreground/95 text-sidebar grid place-items-center font-display font-semibold text-base">
              N
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] tracking-tight">NST Capital</div>
              <div className="text-[10.5px] uppercase tracking-[0.18em] opacity-55">Startup Track</div>
            </div>
          </Link>
        </div>

        <div className="px-6 mb-2 text-[10px] uppercase tracking-[0.22em] opacity-45">Workspace</div>
        <nav className="flex-1 px-3 space-y-0.5 text-[13.5px]">
          {isStudentOnly ? (
            <>
              {founderId && (
                <NavItem to="/os/workspace/$founderId" params={{ founderId }} icon={<Sparkles className="h-[15px] w-[15px]" />}>My Startup</NavItem>
              )}
              <NavItem to="/os/biweekly" icon={<CalendarClock className="h-[15px] w-[15px]" />}>Bi-weekly</NavItem>
              <NavItem to="/os/events" icon={<LayoutDashboard className="h-[15px] w-[15px]" />}>Events</NavItem>
              <NavItem to="/os/mentors" icon={<Users className="h-[15px] w-[15px]" />}>Mentors</NavItem>
            </>
          ) : (
            <>
              <NavItem to="/dashboard" icon={<LayoutDashboard className="h-[15px] w-[15px]" />}>Overview</NavItem>
              <NavItem to="/founders" icon={<Users className="h-[15px] w-[15px]" />}>Portfolio</NavItem>
              <NavItem to="/os" icon={<Sparkles className="h-[15px] w-[15px]" />}>Venture OS</NavItem>
              <NavItem to="/guide" icon={<BookOpen className="h-[15px] w-[15px]" />}>Methodology</NavItem>
              {hasFullAccess && (
                <NavItem to="/os/leadership" icon={<Crown className="h-[15px] w-[15px]" />}>Leadership</NavItem>
              )}
              {isAdmin && (
                <NavItem to="/admin" icon={<ShieldCheck className="h-[15px] w-[15px]" />}>Access Control</NavItem>
              )}
            </>
          )}
        </nav>

        <div className="m-3 mt-4 p-4 rounded-lg bg-sidebar-accent/40 border border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-accent text-accent-foreground grid place-items-center font-display text-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] truncate font-medium">{user?.email}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-60 truncate">
                {roles[0]?.replace("_", " ") || "member"}
              </div>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 canvas-grain">
        <header className="md:hidden flex items-center justify-between border-b border-border/70 px-4 py-3 bg-card/80 backdrop-blur">
          <div className="flex items-center gap-2 font-display text-base">
            <div className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center text-xs font-semibold">N</div>
            NST Capital
          </div>
          <Button onClick={signOut} variant="ghost" size="sm"><LogOut className="h-4 w-4" /></Button>
        </header>
        <div className="px-8 py-10 max-w-[1240px] mx-auto">{children}</div>
        {!isStaff && roles.length > 0 && (
          <div className="text-xs text-muted-foreground px-8 pb-6">Viewing as {roles.join(", ")}.</div>
        )}
      </main>
    </div>
  );
}

function NavItem({ to, icon, children, params }: { to: string; icon: ReactNode; children: ReactNode; params?: Record<string, string> }) {
  return (
    <Link
      to={to as any}
      params={params as any}
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
      inactiveProps={{ className: "text-sidebar-foreground/75" }}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
    >
      <span className="opacity-80">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

export function StatusBadge({ status }: { status: "green" | "yellow" | "red" | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const map = {
    green: "bg-status-green text-status-green-foreground",
    yellow: "bg-status-yellow text-status-yellow-foreground",
    red: "bg-status-red text-status-red-foreground",
  } as const;
  const label = { green: "On Track", yellow: "Watch", red: "At Risk" }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-wider ${map[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
