import type { Project } from "../types";

export type ProjectType = NonNullable<Project["projectType"]>;

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
