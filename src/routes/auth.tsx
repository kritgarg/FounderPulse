import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

function safeNext(v: unknown): string {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//")) return "/dashboard";
  return v;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ href: search.next });
  },
  component: AuthPage,
});

type RequestedRole = "student" | "faculty";

function AuthPage() {
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [requestedRole, setRequestedRole] = useState<RequestedRole>("student");
  const [loading, setLoading] = useState(false);

  const FACULTY_DOMAIN = "newtonschool.co";
  const STUDENT_DOMAIN = "adypu.edu.in";
  const endsWith = (e: string, d: string) => e.trim().toLowerCase().endsWith(`@${d}`);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      toast.info(`Bypassing auth in Demo Mode (${error.message})`);
      window.location.href = next;
      return;
    }
    toast.success("Welcome back");
    window.location.href = next;
  }

  function bypassAuth() {
    toast.success("Entering Demo Mode");
    window.location.href = next;
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const normEmail = email.trim().toLowerCase();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: normEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: { full_name: fullName, requested_role: requestedRole },
      },
    });
    setLoading(false);
    if (error) {
      toast.info(`Bypassing auth in Demo Mode (${error.message})`);
      window.location.href = next;
      return;
    }
    window.location.href = next;
  }

  useEffect(() => { document.title = "Sign in — NST Startup Track"; }, []);

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex relative bg-sidebar text-sidebar-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        <div className="relative flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-sidebar-foreground text-sidebar grid place-items-center font-display font-semibold">N</div>
          <div className="leading-tight">
            <div className="font-display text-base tracking-tight">NST Capital</div>
            <div className="text-[10.5px] uppercase tracking-[0.2em] opacity-60">Startup Track</div>
          </div>
        </div>
        <div className="relative space-y-6 max-w-md">
          <p className="text-[10.5px] uppercase tracking-[0.25em] opacity-60">Venture OS</p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
            Conviction, <span className="italic text-accent">documented</span>.
          </h1>
          <p className="text-[15px] text-sidebar-foreground/70 leading-relaxed">
            One operating system for founders and faculty — built on the rigour we ask of our startups.
          </p>
        </div>
        <div className="relative text-[11px] uppercase tracking-[0.22em] opacity-50">
          NST · Entrepreneurship Office
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 canvas-grain">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-2 justify-center mb-8">
            <GraduationCap className="h-7 w-7 text-accent" />
            <div className="font-display text-lg">NST Capital</div>
          </div>
          <Card className="border-border/70 shadow-none">
            <CardHeader className="space-y-1">
              <CardTitle className="font-display text-2xl">Sign in</CardTitle>
              <CardDescription>Demo Mode enabled. You can bypass authentication below.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full mb-5 border-dashed border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary font-medium"
                onClick={bypassAuth}
              >
                ⚡ Bypass Auth & Explore App (Demo Mode)
              </Button>
              <Tabs defaultValue="signin">
                <TabsList className="grid grid-cols-2 w-full mb-5">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={signIn} className="space-y-3">
                    <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                    <Button className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={signUp} className="space-y-3">
                    <div>
                      <Label>I am a…</Label>
                      <Select value={requestedRole} onValueChange={(v) => setRequestedRole(v as RequestedRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student (founder)</SelectItem>
                          <SelectItem value="faculty">Faculty / Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Full name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={requestedRole === "student" ? `name@${STUDENT_DOMAIN}` : `name@${FACULTY_DOMAIN}`} />
                    </div>
                    <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                    <Button className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
                    {requestedRole === "student" ? (
                      <p className="text-xs text-muted-foreground">
                        Only pre-approved <strong>@{STUDENT_DOMAIN}</strong> students on the Startup Track can sign up.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Faculty sign-ups are restricted to <strong>@{FACULTY_DOMAIN}</strong>. Your request will be sent to <strong>nitish.venkatraman@newtonschool.co</strong> for approval. You will have no access until approved.
                      </p>
                    )}
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
