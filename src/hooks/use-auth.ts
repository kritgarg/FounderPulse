import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "faculty" | "mentor" | "student" | "leadership";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>(["super_admin", "faculty", "leadership", "mentor"]);
  const [founderId, setFounderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCtx = async (uid: string) => {
      try {
        const [{ data: r }, { data: p }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("profiles").select("founder_id").eq("id", uid).maybeSingle(),
        ]);
        if (!mounted) return;
        const fetchedRoles = (r ?? []).map((x) => x.role as AppRole);
        setRoles(fetchedRoles.length > 0 ? fetchedRoles : ["super_admin", "faculty", "leadership", "mentor"]);
        setFounderId((p as any)?.founder_id ?? null);
      } catch {
        if (mounted) setRoles(["super_admin", "faculty", "leadership", "mentor"]);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? ({
        id: "demo-admin-id",
        email: "admin@newtonschool.co",
        user_metadata: { full_name: "Demo Admin" },
      } as any);
      setUser(u);
      if (data.session?.user) loadCtx(data.session.user.id);
      else setRoles(["super_admin", "faculty", "leadership", "mentor"]);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setUser({ id: "demo-admin-id", email: "admin@newtonschool.co" } as any);
      setRoles(["super_admin", "faculty", "leadership", "mentor"]);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => loadCtx(session.user.id), 0);
      } else {
        setUser({ id: "demo-admin-id", email: "admin@newtonschool.co" } as any);
        setRoles(["super_admin", "faculty", "leadership", "mentor"]);
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const effectiveRoles = roles.length > 0 ? roles : ["super_admin", "faculty", "leadership", "mentor"];
  const isStaff = effectiveRoles.includes("super_admin") || effectiveRoles.includes("faculty");
  const isAdmin = effectiveRoles.includes("super_admin");
  const isLeadership = effectiveRoles.includes("super_admin") || effectiveRoles.includes("leadership");
  const isMentor = effectiveRoles.includes("mentor") || effectiveRoles.includes("super_admin");
  const isStudent = effectiveRoles.includes("student") || !!founderId;

  return { user, roles: effectiveRoles, loading, isStaff, isAdmin, isLeadership, isMentor, isStudent, founderId };
}
