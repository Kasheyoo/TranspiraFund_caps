// Component tags for each SME_PROJECTS entry, indexed by array position.
// Interpretive layer over depw_milestone_dataset.json; the raw corpus is
// frozen and SME-validated, but these tags are one reader's judgment PENDING
// DEPW Construction Services Division sign-off. Do not treat as authoritative
// until reviewed.
//
// Tags come from the working vocabulary in the Phase 1 classifier contract v1
// components field. Ordered most-significant-first within each entry. Used by
// the retrieval scorer (Phase 1c, not wired yet) as the dominant matching
// signal; a mis-tag here silently degrades retrieval without any error.
//
// Editing rules:
//   - Every SME_PROJECTS entry must have a corresponding entry here at the
//     same index. Length is asserted at module load, so cold start throws on
//     any mismatch once this module is imported.
//   - Adding a corpus entry means appending here in the same PR.
//   - Adding a vocabulary term requires updating ProjectComponent below AND
//     getting SME sign-off; unchecked additions risk creating tags no corpus
//     entry supports.
//
// Post-1b revisions (pending SME sign-off along with the initial tags):
//   - idx 5 (Upgrading of Electrical Power System): building_renovation
//     dropped, tag is now [electrical_works] alone. Empirical 1b retrieval
//     against "Upgrading of Barangay Electrical Distribution System" (60 CD,
//     components=[electrical_works]) showed building_renovation inflating
//     idx 5's cScore denominator so its base score sat at 0.600 instead of
//     0.875, dropping matchMode from a strong "variant" toward the exact
//     boundary. An electrical upgrade is not envelope renovation, and no
//     other project retrieved idx 5 via building_renovation. Flag alongside
//     the initial tag review.

import { SME_PROJECTS } from "./dataset";

export type ProjectComponent =
  | "road_concreting"
  | "pavement"
  | "pathway"
  | "drainage"
  | "culvert"
  | "waterworks"
  | "water_tank"
  | "pipe_laying"
  | "building_construction"
  | "building_renovation"
  | "vertical_extension"
  | "evacuation_center"
  | "day_care"
  | "covered_court"
  | "covered_walk"
  | "perimeter_fence"
  | "bridge"
  | "footbridge"
  | "slope_protection"
  | "riprap"
  | "electrical_works"
  | "streetlighting";

export const SME_COMPONENTS: readonly (readonly ProjectComponent[])[] = [
  // idx 0: Construction of 4-storey 20 classrooms school building
  ["building_construction", "electrical_works"],
  // idx 1: Road Concreting with Drainage system
  ["road_concreting", "pavement", "drainage", "culvert", "slope_protection"],
  // idx 2: Installation of water tank Inclusive of Gal. Pipes
  ["water_tank", "pipe_laying", "waterworks"],
  // idx 3: Construction of Perimeter Fence
  ["perimeter_fence"],
  // idx 4: Construction of Box Type Culvert
  ["culvert", "drainage", "pavement", "slope_protection"],
  // idx 5: Upgrading of Electrical Power System
  // Post-1b: building_renovation dropped, see file header note.
  ["electrical_works"],
  // idx 6: Renovation of Legislative Building (electrical accent lighting)
  ["electrical_works", "building_renovation"],
  // idx 7: Construction of Cebu City Police Office Building
  ["building_construction"],
  // idx 8: Concreting of Pathways
  ["pathway", "pavement"],
  // idx 9: Construction of water facilities (water system) and Construction of covered walk in.
  ["waterworks", "water_tank", "covered_walk"],
  // idx 10: Construction of DVAIF Building with compound perimeter fence
  ["building_construction", "perimeter_fence", "electrical_works"],
  // idx 11: Construction of Bridge
  ["bridge", "pavement", "road_concreting", "slope_protection"],
  // idx 12: Proposed Reinforced Concrete Bridge
  ["bridge", "drainage", "slope_protection"],
  // idx 13: Renovation of Evacuation Center
  ["evacuation_center", "building_renovation", "electrical_works"],
  // idx 14: Road Concreting with Drainage System
  ["road_concreting", "pavement", "drainage", "culvert", "slope_protection"],
  // idx 15: Construction of Evacuation Center
  ["evacuation_center", "building_construction", "electrical_works"],
  // idx 16: Riprapping of the side of Barangay Hall
  ["riprap", "slope_protection"],
  // idx 17: Slope Protection
  ["slope_protection", "riprap"],
  // idx 18: Construction of Portland Cement Pavement
  ["pavement", "road_concreting", "drainage", "slope_protection"],
  // idx 19: Additional second floor of the multi-purpose gym for conversion into an evacuation center
  ["vertical_extension", "evacuation_center", "building_construction"],
];

if (SME_COMPONENTS.length !== SME_PROJECTS.length) {
  throw new Error(
    `corpusComponents: expected ${SME_PROJECTS.length} entries to match SME_PROJECTS, got ${SME_COMPONENTS.length}. Every corpus addition requires a matching component tag here.`,
  );
}
