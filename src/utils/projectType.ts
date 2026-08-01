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
