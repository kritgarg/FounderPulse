import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, ClipboardCheck, Users2, CalendarDays, Gamepad2, Gavel, Crown, CalendarClock, FileSignature, ClipboardList, Mic, BrainCog, FileText, Bot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/os")({
  component: OsLayout,
});

function OsLayout() {
  const { isStaff, isLeadership, isMentor, founderId } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const hasFullAccess = isStaff || isMentor || isLeadership;

  const tabs = [
    { to: "/os", label: "Home", icon: Sparkles, show: true, exact: true },
    { to: "/os/onboarding", label: "Day 1 Intake", icon: FileSignature, show: hasFullAccess || !!founderId },
    { to: "/os/questionnaire", label: "Onboarding Q", icon: ClipboardList, show: hasFullAccess || !!founderId },
    { to: "/os/biweekly", label: "Bi-weekly", icon: CalendarClock, show: hasFullAccess || !!founderId },
    { to: "/os/transcripts", label: "Transcripts", icon: Mic, show: hasFullAccess },
    { to: "/os/mentor-review", label: "Mentor Review", icon: BrainCog, show: hasFullAccess },
    { to: "/os/dossiers", label: "Dossiers", icon: FileText, show: hasFullAccess || !!founderId },
    { to: "/os/review", label: "Faculty Review", icon: ClipboardCheck, show: hasFullAccess },
    { to: "/os/mentors", label: "Mentors", icon: Users2, show: hasFullAccess || !!founderId },
    { to: "/os/events", label: "Events", icon: CalendarDays, show: true },
    { to: "/os/simulations", label: "Simulations", icon: Gamepad2, show: true },
    { to: "/os/committees", label: "Committees", icon: Gavel, show: hasFullAccess },
    { to: "/os/leadership", label: "Leadership", icon: Crown, show: hasFullAccess },
    { to: "/os/agents", label: "Agents", icon: Bot, show: hasFullAccess },
  ].filter((t) => t.show);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-accent/15 text-accent grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">NST Venture OS</div>
            <div className="font-display text-xl tracking-tight">Entrepreneurship Track</div>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 flex-wrap border-b border-border/70 -mt-2 pb-0">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 -mb-px transition-colors ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
