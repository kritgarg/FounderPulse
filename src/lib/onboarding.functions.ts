import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SectionPayload = Record<string, unknown>;

/**
 * Minimum evidence required before a founder can submit their onboarding.
 * Each key is a section on onboarding_documents; at least one document
 * (link or file) must exist for that section.
 */
export const REQUIRED_EVIDENCE_SECTIONS: { key: string; label: string }[] = [
  { key: "product", label: "Product demo / screenshots" },
  { key: "customers", label: "Customer interviews / pilot list" },
  { key: "revenue", label: "Revenue proof (invoice, LOI, or pricing)" },
  { key: "traction", label: "Traction / metrics evidence" },
  { key: "team", label: "Team page or LinkedIn URLs" },
];

export interface OnboardingUpsertInput {
  founderId: string;
  product?: SectionPayload;
  process?: SectionPayload;
  customers?: SectionPayload;
  revenue?: SectionPayload;
  team?: SectionPayload;
  traction?: SectionPayload;
  market?: SectionPayload;
  moat?: SectionPayload;
  financials?: SectionPayload;
  risks?: SectionPayload;
  next_90_days?: SectionPayload;
  current_stage?: string;
  submit?: boolean;
}

export const upsertOnboardingQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): OnboardingUpsertInput => {
    const i = input as OnboardingUpsertInput;
    if (!i?.founderId) throw new Error("founderId required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload: Record<string, unknown> = { founder_id: data.founderId };
    const keys = [
      "product","process","customers","revenue","team","traction",
      "market","moat","financials","risks","next_90_days","current_stage",
    ] as const;
    for (const k of keys) if (data[k] !== undefined) payload[k] = data[k];

    if (data.submit) {
      // Enforce evidence checklist: at least one document per required section.
      const { data: docs, error: docErr } = await supabase
        .from("onboarding_documents")
        .select("section")
        .eq("founder_id", data.founderId);
      if (docErr) throw new Error(docErr.message);
      const present = new Set((docs ?? []).map((d: any) => d.section));
      const missing = REQUIRED_EVIDENCE_SECTIONS.filter((s) => !present.has(s.key));
      if (missing.length > 0) {
        throw new Error(
          `Cannot submit — missing required evidence for: ${missing.map((m) => m.label).join("; ")}`,
        );
      }
      payload.submitted_at = new Date().toISOString();
      payload.submitted_by = context.userId;
    }

    const { data: existing } = await supabase
      .from("onboarding_questionnaires")
      .select("id")
      .eq("founder_id", data.founderId)
      .maybeSingle();

    const q = existing
      ? await supabase.from("onboarding_questionnaires")
          .update(payload as never).eq("id", existing.id).select("*").single()
      : await supabase.from("onboarding_questionnaires")
          .insert(payload as never).select("*").single();

    if (q.error) throw new Error(q.error.message);
    return { ok: true, questionnaire: q.data };
  });

/**
 * Read-only status of the evidence checklist for a founder.
 * Returns which required sections have at least one attached document,
 * so both the founder UI and mentor screens can see submission-readiness.
 */
export const getEvidenceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): { founderId: string } => {
    const i = input as { founderId: string };
    if (!i?.founderId) throw new Error("founderId required");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: docs, error } = await supabase
      .from("onboarding_documents")
      .select("section")
      .eq("founder_id", data.founderId);
    if (error) throw new Error(error.message);
    const present = new Set((docs ?? []).map((d: any) => d.section));
    const status = REQUIRED_EVIDENCE_SECTIONS.map((s) => ({
      key: s.key,
      label: s.label,
      complete: present.has(s.key),
    }));
    const allComplete = status.every((s) => s.complete);
    return { status, allComplete };
  });

export interface OnboardingDocInput {
  questionnaireId: string;
  founderId: string;
  section: string;
  title: string;
  kind: "file" | "link";
  url?: string;
  filePath?: string;
  mime?: string;
  sizeBytes?: number;
  notes?: string;
}

export const addOnboardingDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): OnboardingDocInput => {
    const i = input as OnboardingDocInput;
    if (!i?.questionnaireId || !i?.founderId || !i?.section || !i?.title || !i?.kind) {
      throw new Error("questionnaireId, founderId, section, title, kind are required");
    }
    if (i.kind === "link" && !i.url) throw new Error("url required for link");
    if (i.kind === "file" && !i.filePath) throw new Error("filePath required for file");
    return i;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("onboarding_documents")
      .insert({
        questionnaire_id: data.questionnaireId,
        founder_id: data.founderId,
        section: data.section,
        title: data.title,
        kind: data.kind,
        url: data.url ?? null,
        file_path: data.filePath ?? null,
        mime: data.mime ?? null,
        size_bytes: data.sizeBytes ?? null,
        notes: data.notes ?? null,
        uploaded_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, document: row };
  });
