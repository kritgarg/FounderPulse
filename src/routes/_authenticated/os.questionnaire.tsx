import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, XCircle, Paperclip, Link as LinkIcon, Upload, Send } from "lucide-react";
import { toast } from "sonner";
import { upsertOnboardingQuestionnaire, addOnboardingDocument } from "@/lib/onboarding.functions";

/** Sections that must have at least one uploaded document/link before submit is allowed. */
const REQUIRED_EVIDENCE: { key: string; label: string }[] = [
  { key: "product", label: "Product demo / screenshots" },
  { key: "customers", label: "Customer interviews / pilot list" },
  { key: "revenue", label: "Revenue proof (invoice, LOI, or pricing)" },
  { key: "traction", label: "Traction / metrics evidence" },
  { key: "team", label: "Team page or LinkedIn URLs" },
];

export const Route = createFileRoute("/_authenticated/os/questionnaire")({
  component: OnboardingQuestionnaire,
});

/** Section spec: prompts + list of evidence titles founders are asked to attach. */
const SECTIONS: {
  key: "product" | "process" | "customers" | "revenue" | "team" | "traction" | "market" | "moat" | "financials" | "risks" | "next_90_days";
  title: string;
  blurb: string;
  fields: { key: string; label: string; hint?: string; long?: boolean }[];
  evidence: string[];
}[] = [
  {
    key: "product", title: "Product",
    blurb: "What have you actually built? What's live, what's a prototype, what's on paper?",
    fields: [
      { key: "what_built", label: "What have you shipped?", long: true, hint: "MVP, prototype, waitlist page — be specific." },
      { key: "core_features", label: "Core features that work today", long: true },
      { key: "not_built", label: "What is intentionally NOT built yet, and why", long: true },
      { key: "demo_link", label: "Live demo / product URL" },
    ],
    evidence: ["Demo video (≤3 min)", "Product screenshots (3+)", "Architecture / build doc"],
  },
  {
    key: "process", title: "Process",
    blurb: "How does the team operate day to day?",
    fields: [
      { key: "sprint_cadence", label: "Sprint / cadence" },
      { key: "tools", label: "Tools you use" },
      { key: "weekly_hours", label: "Team weekly hours committed" },
      { key: "decision_making", label: "How major decisions get made", long: true },
    ],
    evidence: ["Sprint board screenshot", "Team weekly review doc"],
  },
  {
    key: "customers", title: "Customers",
    blurb: "Who is buying, or refusing to buy, right now?",
    fields: [
      { key: "icp", label: "Ideal customer profile (specific)", long: true },
      { key: "interviews_done", label: "# discovery interviews done to date" },
      { key: "active_users", label: "# active users / pilots today" },
      { key: "top_objection", label: "Top objection you keep hearing", long: true },
    ],
    evidence: ["Interview log (spreadsheet)", "3 anonymised interview notes", "Pilot user list"],
  },
  {
    key: "revenue", title: "Revenue stream",
    blurb: "Where is money coming from — or where will it come from?",
    fields: [
      { key: "model", label: "Business model", long: true },
      { key: "price_point", label: "Price point(s)" },
      { key: "mrr_today", label: "MRR / revenue in last 30 days (₹)" },
      { key: "paying_customers", label: "# paying customers today" },
      { key: "loi_signed", label: "# LOIs / prepayments signed" },
    ],
    evidence: ["Invoices / Stripe screenshot", "Signed LOI(s)", "Pricing page or doc"],
  },
  {
    key: "team", title: "Team",
    blurb: "Who is on this, and how committed are they?",
    fields: [
      { key: "cofounders", label: "Co-founders (name, role, equity)", long: true },
      { key: "advisors", label: "Advisors / mentors already helping", long: true },
      { key: "hiring_now", label: "Any open roles you're hiring for" },
    ],
    evidence: ["Team page / LinkedIn URLs", "Cap table snapshot"],
  },
  {
    key: "traction", title: "Traction",
    blurb: "What's measurably better than 3 months ago?",
    fields: [
      { key: "north_star", label: "Your north-star metric", hint: "Just one." },
      { key: "north_star_value", label: "Current value + 90-day trajectory", long: true },
      { key: "other_metrics", label: "Other key numbers (users, revenue, retention)", long: true },
    ],
    evidence: ["Metrics dashboard screenshot", "Growth chart (last 8 weeks)"],
  },
  {
    key: "market", title: "Market",
    blurb: "How big is this really, and where do you play first?",
    fields: [
      { key: "tam_sam_som", label: "TAM / SAM / SOM (with source)", long: true },
      { key: "beachhead", label: "Beachhead segment", long: true },
      { key: "competitors", label: "Top 3 competitors / alternatives", long: true },
    ],
    evidence: ["Market sizing doc", "Competitor comparison table"],
  },
  {
    key: "moat", title: "Moat / unfair advantage",
    blurb: "Why you, why now?",
    fields: [
      { key: "unfair_advantage", label: "Your unfair advantage", long: true },
      { key: "why_now", label: "Why the market is ready in 2026", long: true },
    ],
    evidence: ["IP / research artifacts (if any)"],
  },
  {
    key: "financials", title: "Financials",
    blurb: "What does the burn / runway look like?",
    fields: [
      { key: "capital_raised", label: "Capital raised to date (₹)" },
      { key: "monthly_burn", label: "Monthly burn (₹)" },
      { key: "runway_months", label: "Runway (months)" },
      { key: "next_raise", label: "Next raise plan (amount + timing)", long: true },
    ],
    evidence: ["Bank / cap statement", "12-month financial model"],
  },
  {
    key: "risks", title: "Risks",
    blurb: "What could actually kill this in the next 6 months?",
    fields: [
      { key: "top_risks", label: "Top 3 risks", long: true, hint: "One per line. Be honest — mentors help you here." },
      { key: "mitigation", label: "How you plan to mitigate each", long: true },
    ],
    evidence: [],
  },
  {
    key: "next_90_days", title: "Next 90 days",
    blurb: "What must be true by Nov 1, 2026?",
    fields: [
      { key: "must_ship", label: "Things that must ship", long: true },
      { key: "kpi_targets", label: "KPI targets (be numeric)", long: true },
      { key: "mentor_asks", label: "What you need from mentors", long: true },
    ],
    evidence: ["Roadmap doc"],
  },
];

function OnboardingQuestionnaire() {
  const { founderId, isStaff, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState<any>(null);
  const [sections, setSections] = useState<Record<string, Record<string, string>>>({});
  const [docs, setDocs] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const runUpsert = useServerFn(upsertOnboardingQuestionnaire);
  const runAddDoc = useServerFn(addOnboardingDocument);

  useEffect(() => {
    if (!founderId) { setReady(true); return; }
    (async () => {
      const [{ data: qr }, { data: dr }] = await Promise.all([
        supabase.from("onboarding_questionnaires").select("*").eq("founder_id", founderId).maybeSingle(),
        supabase.from("onboarding_documents").select("*").eq("founder_id", founderId).order("created_at", { ascending: false }),
      ]);
      setQ(qr);
      setDocs(dr ?? []);
      if (qr) {
        const s: any = {};
        for (const sec of SECTIONS) s[sec.key] = (qr as any)[sec.key] ?? {};
        setSections(s);
      } else {
        setSections(Object.fromEntries(SECTIONS.map((s) => [s.key, {}])));
      }
      setReady(true);
    })();
  }, [founderId]);

  if (loading || !ready) return <div className="text-muted-foreground">Loading…</div>;
  if (!founderId && !isStaff) return <Navigate to="/os" replace />;
  if (!founderId) return <div className="text-muted-foreground">Onboarding questionnaire is for founders.</div>;

  const submitted = !!q?.submitted_at;
  const totalSteps = SECTIONS.length + 1; // + submit step
  const isSubmitStep = step === SECTIONS.length;
  const active = isSubmitStep ? null : SECTIONS[step];
  const isLastSection = step === SECTIONS.length - 1;

  // Evidence checklist status
  const evidencePresent = new Set(docs.map((d) => d.section));
  const evidenceStatus = REQUIRED_EVIDENCE.map((e) => ({ ...e, complete: evidencePresent.has(e.key) }));
  const allEvidenceComplete = evidenceStatus.every((s) => s.complete);

  async function save(submit: boolean) {
    if (submit && !allEvidenceComplete) {
      toast.error("Complete every required evidence upload first");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { founderId };
      for (const s of SECTIONS) payload[s.key] = sections[s.key] ?? {};
      if (submit) payload.submit = true;
      const res = await runUpsert({ data: payload });
      setQ((res as any).questionnaire);
      toast.success(submit ? "Questionnaire submitted" : "Draft saved");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-accent/15 text-accent grid place-items-center">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">Aug 1 · Onboarding questionnaire</div>
          <div className="font-display text-2xl tracking-tight">Where is your startup today?</div>
          <p className="text-xs text-muted-foreground mt-0.5">Detailed snapshot + evidence uploads. Feeds your AI-compiled dossier.</p>
        </div>
      </div>

      {submitted && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Submitted on {new Date(q.submitted_at).toLocaleDateString()}. Editing updates the record.
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {SECTIONS.map((s, i) => (
          <button key={s.key} onClick={() => setStep(i)}
            className={`text-[10.5px] uppercase tracking-[0.16em] px-2 py-1 rounded-sm border ${i === step ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:text-foreground"}`}>
            {s.title}
          </button>
        ))}
        <button onClick={() => setStep(SECTIONS.length)}
          className={`text-[10.5px] uppercase tracking-[0.16em] px-2 py-1 rounded-sm border ${isSubmitStep ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:text-foreground"}`}>
          Submit
        </button>
      </div>

      {isSubmitStep ? (
        <Card className="border-border/70 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Evidence checklist & submit</CardTitle>
            <p className="text-xs text-muted-foreground">
              Before submitting, every required section below must have at least one uploaded
              document or link. Mentors see this status live.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {evidenceStatus.map((s) => (
                <div key={s.key} className={`flex items-center justify-between border rounded-md px-3 py-2 text-xs ${s.complete ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                  <div className="flex items-center gap-2">
                    {s.complete
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <XCircle className="h-4 w-4 text-amber-600" />}
                    <div>
                      <div className="font-medium capitalize">{s.key.replace(/_/g, " ")}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  </div>
                  {!s.complete && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10.5px]"
                      onClick={() => setStep(SECTIONS.findIndex((sec) => sec.key === s.key))}>
                      Jump to section →
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className={`text-xs rounded-md px-3 py-2 border ${allEvidenceComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              {allEvidenceComplete
                ? "All required evidence uploaded. You're ready to submit."
                : `Still missing evidence for ${evidenceStatus.filter((s) => !s.complete).length} section(s). Submit is disabled until every required upload is present.`}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save draft</Button>
                <Button size="sm" disabled={saving || !allEvidenceComplete} onClick={() => save(true)}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {submitted ? "Re-submit" : "Submit questionnaire"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-1">
          <CardTitle className="text-base">{active!.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{active!.blurb}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {active!.fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</Label>
              {f.hint && <p className="text-[10.5px] text-muted-foreground mt-0.5">{f.hint}</p>}
              {f.long ? (
                <Textarea rows={3} className="mt-1.5"
                  value={sections[active!.key]?.[f.key] ?? ""}
                  onChange={(e) => setSections({ ...sections, [active!.key]: { ...(sections[active!.key] ?? {}), [f.key]: e.target.value } })} />
              ) : (
                <Input className="mt-1.5"
                  value={sections[active!.key]?.[f.key] ?? ""}
                  onChange={(e) => setSections({ ...sections, [active!.key]: { ...(sections[active!.key] ?? {}), [f.key]: e.target.value } })} />
              )}
            </div>
          ))}

          {/* Evidence uploads */}
          {q?.id && (
            <div className="border-t border-border/60 pt-3">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground mb-2 flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" /> Evidence uploads for {active!.title.toLowerCase()}
                {REQUIRED_EVIDENCE.some((r) => r.key === active!.key) && (
                  <Badge variant="outline" className="text-[9px] ml-1">Required for submit</Badge>
                )}
              </div>
              {active!.evidence.length > 0 && (
                <ul className="text-xs text-muted-foreground list-disc pl-5 mb-3">
                  {active!.evidence.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              <EvidenceUploader
                founderId={founderId}
                questionnaireId={q.id}
                section={active!.key}
                existing={docs.filter((d) => d.section === active!.key)}
                onAdded={(row) => setDocs([row, ...docs])}
                onServerAdd={async (input) => {
                  const res = await runAddDoc({ data: input });
                  return (res as any).document;
                }}
              />
            </div>
          )}
          {!q?.id && (
            <div className="text-[11px] text-muted-foreground italic border-t border-border/60 pt-3">
              Save a draft first to attach evidence for this section.
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {!isSubmitStep && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>Save draft</Button>
            {isLastSection ? (
              <Button size="sm" onClick={() => setStep(SECTIONS.length)}>Review & submit →</Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>Next</Button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function EvidenceUploader({ founderId, questionnaireId, section, existing, onAdded, onServerAdd }: {
  founderId: string; questionnaireId: string; section: string;
  existing: any[]; onAdded: (row: any) => void;
  onServerAdd: (input: any) => Promise<any>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function addLink() {
    if (!title || !url) return toast.error("Title + URL required");
    setBusy(true);
    try {
      const row = await onServerAdd({ questionnaireId, founderId, section, title, kind: "link", url });
      onAdded(row);
      setTitle(""); setUrl("");
      toast.success("Link added");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function uploadFile(file: File) {
    if (!title) return toast.error("Add a title first");
    setBusy(true);
    try {
      const path = `${founderId}/${section}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("evidence").upload(path, file, { upsert: false });
      if (error) throw error;
      const row = await onServerAdd({
        questionnaireId, founderId, section, title, kind: "file",
        filePath: path, mime: file.type, sizeBytes: file.size,
      });
      onAdded(row);
      setTitle("");
      toast.success("File uploaded");
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2">
        <Input placeholder="Title (e.g. Interview log)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Paste link (Drive, Notion, Loom…)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button variant="outline" size="sm" disabled={busy} onClick={addLink}>
          <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Add link
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer border border-border/70 rounded-md px-2.5 py-1.5 hover:bg-muted">
          <Upload className="h-3.5 w-3.5" /> Upload file
          <input type="file" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = "";
          }} />
        </label>
        <span className="text-[10.5px] text-muted-foreground">Files go to the private evidence bucket.</span>
      </div>

      {existing.length > 0 && (
        <div className="space-y-1">
          {existing.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs border border-border/60 rounded-md px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{d.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {d.kind === "link" ? d.url : d.file_path}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{d.kind}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
