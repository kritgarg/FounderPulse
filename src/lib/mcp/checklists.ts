// Stage-aware bi-weekly evidence checklist. Kept in sync with the checklist
// rendered in src/routes/_authenticated/os.biweekly.tsx.
export type ChecklistItem = { key: string; label: string; hint?: string };
export type Checklist = { stage: string; items: ChecklistItem[] };

export const CYCLES = 13;
export const CYCLE_LENGTH_DAYS = 14;
export const GRACE_DAYS = 3;

export const CHECKLISTS: Record<number, Checklist> = {
  1: { stage: "Discovery — Kickoff", items: [
    { key: "problem_doc", label: "Problem statement (1-pager)", hint: "Who hurts, how much, why now." },
    { key: "interviews_3", label: "3 customer discovery interviews (recording or transcript)" },
    { key: "assumptions_map", label: "Riskiest assumptions map" },
    { key: "goals_2w", label: "2-week goals doc" },
  ]},
  2: { stage: "Discovery — Expand", items: [
    { key: "interviews_5", label: "5 more customer interviews" },
    { key: "jtbd", label: "Jobs-to-be-Done statements (3 personas)" },
    { key: "competitor_map", label: "Competitor / alternatives map" },
    { key: "insight_note", label: "Discovery insight note (what changed)" },
  ]},
  3: { stage: "Validation — Signal", items: [
    { key: "landing_page", label: "Landing page live URL" },
    { key: "waitlist_signups", label: "Waitlist signups screenshot (≥25)" },
    { key: "survey_results", label: "Survey results (n ≥ 20)" },
    { key: "pricing_hyp", label: "Pricing hypothesis doc" },
  ]},
  4: { stage: "Validation — Commit", items: [
    { key: "loi_or_prepay", label: "Letter of intent or pre-payment (≥1)" },
    { key: "wizard_test", label: "Wizard-of-Oz / concierge test log" },
    { key: "value_prop_v2", label: "Value prop v2 (revised)" },
    { key: "assumption_kill", label: "Assumptions killed / kept summary" },
  ]},
  5: { stage: "MVP — Build v1", items: [
    { key: "mvp_demo", label: "MVP demo video (≤3 min)" },
    { key: "tech_doc", label: "Architecture / build doc" },
    { key: "user_test_3", label: "3 user testing recordings" },
    { key: "bug_log", label: "Bug / iteration log" },
  ]},
  6: { stage: "MVP — Iterate", items: [
    { key: "mvp_v2_demo", label: "MVP v2 demo (post-iteration)" },
    { key: "usability_report", label: "Usability findings report" },
    { key: "activation_metric", label: "Activation metric definition + first read" },
    { key: "roadmap_next", label: "Roadmap for next cycle" },
  ]},
  7: { stage: "Pilot — Launch", items: [
    { key: "pilot_users", label: "Pilot user list (≥5 with contact)" },
    { key: "onboarding_flow", label: "Onboarding flow doc" },
    { key: "feedback_log", label: "Structured pilot feedback log" },
    { key: "nps_or_csat", label: "NPS / CSAT first read" },
  ]},
  8: { stage: "Pilot — Retain", items: [
    { key: "retention_chart", label: "W1/W2 retention chart" },
    { key: "case_study", label: "1 written case study" },
    { key: "pricing_test", label: "Pricing test results" },
    { key: "churn_reasons", label: "Churn interviews (≥3)" },
  ]},
  9: { stage: "Traction — Revenue", items: [
    { key: "revenue_proof", label: "Revenue proof (invoices / stripe)" },
    { key: "cac_ltv", label: "CAC / LTV first estimate" },
    { key: "growth_chart", label: "Weekly growth chart (last 8 weeks)" },
    { key: "channel_test", label: "Channel test summary" },
  ]},
  10: { stage: "Traction — Scale readiness", items: [
    { key: "unit_econ", label: "Unit economics model" },
    { key: "hiring_plan", label: "Hiring / capacity plan" },
    { key: "ops_playbook", label: "Ops playbook v1" },
    { key: "risk_register", label: "Risk register" },
  ]},
  11: { stage: "Final — Story", items: [
    { key: "pitch_deck", label: "Investor / defense deck v1" },
    { key: "financial_model", label: "12-month financial model" },
    { key: "team_bios", label: "Team & advisors doc" },
    { key: "traction_1pager", label: "Traction 1-pager" },
  ]},
  12: { stage: "Final — Rehearsal", items: [
    { key: "pitch_v2", label: "Deck v2 (post-mentor review)" },
    { key: "dry_run_video", label: "Dry-run pitch video" },
    { key: "qa_prep", label: "Q&A prep doc (20 questions)" },
    { key: "next_6mo_plan", label: "Next 6-month plan" },
  ]},
  13: { stage: "Final — Defense", items: [
    { key: "final_deck", label: "Final defense deck (locked)" },
    { key: "demo_final", label: "Final demo recording" },
    { key: "outcomes_doc", label: "Outcomes summary (what shipped, what next)" },
    { key: "career_reco_form", label: "Career recommendation intake filled" },
  ]},
};

export function computeCycleWindow(intakeISO: string, cycleNumber: number) {
  const start = new Date(intakeISO);
  start.setDate(start.getDate() + (cycleNumber - 1) * CYCLE_LENGTH_DAYS);
  const end = new Date(start);
  end.setDate(start.getDate() + CYCLE_LENGTH_DAYS - 1);
  const deadline = new Date(end);
  deadline.setDate(deadline.getDate() + GRACE_DAYS);
  return {
    cycle_number: cycleNumber,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    deadline: deadline.toISOString().slice(0, 10),
  };
}
