// SME-validated project milestone corpus from the Cebu City DEPW Construction
// Services Division. Twenty projects, 167 milestones total, confirmed by
// DEPW-Assigned Project Engineers. Durations are calendar days (CD).
//
// This is the single source of truth for milestone reference data used by
// generateMilestones. Do not paraphrase, summarize, reorder, or otherwise
// modify the milestone name/desc/crew/days values — they must match the JSON
// file verbatim.

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

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

// Content hash of the SME corpus JSON, first 12 hex chars of SHA-256 over the
// raw file bytes. Computed once at module load. Any change to the corpus,
// however small, produces a new value. Mirrors the CLASSIFIER_VERSION pattern
// on the web side. Consumed by generateMilestones provenance (response and
// audit) so an auditor can pin a milestone plan to a specific corpus snapshot.
//
// Provenance-only field: never block milestone generation on this hash. If the
// build's cpSync step ever fails to place the JSON alongside the compiled
// dataset.js, fs.readFileSync throws and would otherwise take down every
// export in this module. Wrap in a try/catch and fall back to the sentinel
// "unknown" with a console.warn so retrieval keeps working.
function computeCorpusVersion(): string {
  try {
    return crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "depw_milestone_dataset.json")))
      .digest("hex")
      .slice(0, 12);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[dataset] CORPUS_VERSION unavailable, using "unknown" sentinel. Reason: ${msg}`,
    );
    return "unknown";
  }
}

export const CORPUS_VERSION: string = computeCorpusVersion();
