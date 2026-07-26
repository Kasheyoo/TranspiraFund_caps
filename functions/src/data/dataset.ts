// SME-validated project milestone corpus from the Cebu City DEPW Construction
// Services Division. Twenty projects, 167 milestones total, confirmed by
// DEPW-Assigned Project Engineers. Durations are calendar days (CD).
//
// This is the single source of truth for milestone reference data used by
// generateMilestones. Do not paraphrase, summarize, reorder, or otherwise
// modify the milestone name/desc/crew/days values — they must match the JSON
// file verbatim.

export type SmeMilestone = {
  no: number;
  name: string;
  desc: string;
  crew: string;
  days: number;
};

export type SmeProject = {
  no: number;
  name: string;
  total: number;
  ms: SmeMilestone[];
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const raw = require("./depw_milestone_dataset.json") as SmeProject[];

if (!Array.isArray(raw) || raw.length === 0) {
  throw new Error("depw_milestone_dataset.json: expected non-empty array of SME projects");
}

export const SME_PROJECTS: readonly SmeProject[] = raw;
