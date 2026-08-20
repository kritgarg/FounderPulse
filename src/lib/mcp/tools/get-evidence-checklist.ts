import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CHECKLISTS } from "../checklists";

export default defineTool({
  name: "get_evidence_checklist",
  title: "Get evidence checklist for a cycle",
  description:
    "Return the stage-aware evidence checklist and upload requirements for a bi-weekly cycle (1-13). Use to tell a founder or mentor exactly what to submit or review this cycle.",
  inputSchema: {
    cycle_number: z.number().int().min(1).max(13).describe("Bi-weekly cycle number."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cycle_number }) => {
    const c = CHECKLISTS[cycle_number];
    if (!c) {
      return { content: [{ type: "text", text: `No checklist defined for cycle ${cycle_number}` }], isError: true };
    }
    const payload = { cycle_number, stage: c.stage, items: c.items, required_count: c.items.length };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
