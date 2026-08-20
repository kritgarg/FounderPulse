import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "faculty" | "mentor" | "student" | "leadership";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [founderId, setFounderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCtx = async (uid: string) => {
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("founder_id").eq("id", uid).maybeSingle(),
      ]);
      if (!mounted) return;
      setRoles((r ?? []).map((x) => x.role as AppRole));
      setFounderId((p as any)?.founder_id ?? null);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadCtx(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setTimeout(() => loadCtx(session.user.id), 0);
      else { setRoles([]); setFounderId(null); }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const isStaff = roles.includes("super_admin") || roles.includes("faculty");
  const isAdmin = roles.includes("super_admin");
  const isLeadership = roles.includes("super_admin") || roles.includes("leadership");
  const isMentor = roles.includes("mentor");
  const isStudent = roles.includes("student") || !!founderId;

  return { user, roles, loading, isStaff, isAdmin, isLeadership, isMentor, isStudent, founderId };
}
