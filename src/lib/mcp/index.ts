import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listFounders from "./tools/list-founders";
import listBiweeklySubmissions from "./tools/list-biweekly-submissions";
import getFounderIntake from "./tools/get-founder-intake";
import submitMentorObservation from "./tools/submit-mentor-observation";
import upsertFacultyEvaluation from "./tools/upsert-faculty-evaluation";
import exportEvaluationsCsv from "./tools/export-evaluations-csv";
import getFounderEvaluations from "./tools/get-founder-evaluations";
import createBiweeklySubmission from "./tools/create-biweekly-submission";
import listBiweeklySubmissionsScoped from "./tools/list-biweekly-submissions-scoped";
import getEvidenceChecklist from "./tools/get-evidence-checklist";
import getCurrentCycleWindow from "./tools/get-current-cycle-window";
import generateReviewBoardSummary from "./tools/generate-review-board-summary";

// Direct Supabase host is required for the OAuth issuer (see knowledge).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nst-startup-track-mcp",
  title: "NST Startup Track",
  version: "0.1.0",
  instructions:
    "Tools for the NST Capital Entrepreneurship Track. Identity: `whoami`. Cycle info: `get_current_cycle_window` (founder's active window + deadlines), `get_evidence_checklist` (stage-aware upload requirements per cycle). Browse: `list_founders`, `get_founder_intake`, `list_biweekly_submissions`, `list_biweekly_submissions_scoped` (role-scoped with lock/missed flags). Founder writes: `create_biweekly_submission` (draft/submit with evidence links). Mentor writes: `submit_mentor_observation` (mentor/staff only). Faculty writes: `upsert_faculty_evaluation` (staff only — rubric scores, evidence refs, recommendations). Reporting: `get_founder_evaluations`, `export_evaluations_csv`, `generate_review_board_summary` (staff-only AI-synthesized strengths/concerns/recommendation over a cycle or date window). All tools enforce Supabase RLS plus explicit server-side role checks.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listFounders,
    getFounderIntake,
    listBiweeklySubmissions,
    listBiweeklySubmissionsScoped,
    getEvidenceChecklist,
    getCurrentCycleWindow,
    createBiweeklySubmission,
    submitMentorObservation,
    upsertFacultyEvaluation,
    getFounderEvaluations,
    exportEvaluationsCsv,
    generateReviewBoardSummary,
  ],
});
