import type { Project } from "../types";

export type ProjectType = NonNullable<Project["projectType"]>;

// Cross-boundary twin: PROJECT_TYPE_LABELS in functions/src/index.ts holds the
// identical map on the server, used by that file's projectTypeLabel helper for
// audit messages. Cannot import across the RN/functions boundary; keep the two
// maps in lockstep so audit copy and UI copy agree on every type label.
const LABELS: Record<ProjectType, string> = {
  road_concreting: "Road Concreting",
  drainage_construction: "Drainage",
  multi_purpose_building: "Multi-Purpose Building",
  covered_court: "Covered Court",
  day_care_center: "Day Care Center",
  footbridge: "Footbridge",
  slope_protection: "Slope Protection",
  waterworks: "Waterworks",
  electrification: "Electrification",
  unknown: "Unverified",
};

export const projectTypeLabel = (projectType?: string): string => {
  if (!projectType) return "Unverified";
  return LABELS[projectType as ProjectType] ?? "Unverified";
};

export const isProjectVerified = (projectType?: string): boolean =>
  !!projectType && projectType !== "unknown";

// Mirrors the server-side admission gate in functions/src/index.ts. Contract-v1
// projects with classification.admitted === true generate regardless of the
// legacy projectType allowlist and confidence floor. Pre-contract projects
// (classification.admitted undefined) fall through to isProjectVerified plus
// classificationConfidence >= 0.8. Any other state (admitted === false, or
// missing top-level type at low confidence) is blocked.
//
// Retrieval quality does NOT gate this. matchMode, noveltyScore, isComposite
// affect what the AI SUGGESTS; they never affect what the PE is PERMITTED to
// do. Add/edit/delete/confirm affordances inside the review modal remain
// unconditional regardless of the value returned here.
export const canGenerateMilestones = (project: {
  projectType?: string;
  classificationConfidence?: number;
  classification?: { admitted?: boolean };
}): boolean => {
  const admitted = project.classification?.admitted;
  if (admitted === true) return true;
  if (admitted === undefined) {
    return (
      isProjectVerified(project.projectType) &&
      typeof project.classificationConfidence === "number" &&
      project.classificationConfidence >= 0.8
    );
  }
  return false;
};
