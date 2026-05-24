import type { Milestone } from "../types";

export const MAX_PHASES = 12;
export const MIN_PHASES = 1;
export const MIN_WEIGHT = 1;
export const MIN_DURATION = 1;

export type DraftPhase = {
  id: string;
  sequence: number;
  title: string;
  description?: string;
  weightPercentage: number;
  suggestedDurationDays: number;
  status?: string;
  confirmed?: boolean;
  generatedBy?: string;
  _pendingDelete?: boolean;
  _isNew?: boolean;
};

export type DraftValidation =
  | { ok: true }
  | { ok: false; reason: string };

const clampMin = (value: number, min: number): number =>
  Number.isFinite(value) && value > min ? Math.floor(value) : min;

const activePhases = (phases: DraftPhase[]): DraftPhase[] =>
  phases.filter((p) => !p._pendingDelete);

export const fromMilestones = (milestones: Milestone[]): DraftPhase[] => {
  const sorted = [...milestones].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );
  return sorted.map((m, idx) => ({
    id: m.id,
    sequence: idx + 1,
    title: m.title ?? "",
    description: m.description ?? "",
    weightPercentage: clampMin(m.weightPercentage ?? 0, MIN_WEIGHT),
    suggestedDurationDays: clampMin(
      m.suggestedDurationDays ?? MIN_DURATION,
      MIN_DURATION,
    ),
    status: m.status,
    confirmed: m.confirmed,
    generatedBy: m.generatedBy,
  }));
};

export const renumberSequences = (phases: DraftPhase[]): DraftPhase[] => {
  const active = activePhases(phases).sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
  );
  const renumbered = active.map((p, idx) => ({ ...p, sequence: idx + 1 }));
  const deleted = phases.filter((p) => p._pendingDelete);
  return [...renumbered, ...deleted];
};

// Duration-proportional weighting with largest-remainder rounding so that the
// sum equals exactly 100. Enforces MIN_WEIGHT = 1 by stealing from the largest
// allocation if any phase would otherwise round to 0.
export const recomputeWeights = (phases: DraftPhase[]): DraftPhase[] => {
  const active = activePhases(phases);
  if (active.length === 0) return phases;

  const totalDuration = active.reduce(
    (sum, p) => sum + clampMin(p.suggestedDurationDays, MIN_DURATION),
    0,
  );
  if (totalDuration <= 0) return phases;

  const raw = active.map(
    (p) => (clampMin(p.suggestedDurationDays, MIN_DURATION) / totalDuration) * 100,
  );
  const floors = raw.map((r) => Math.floor(r));
  const remainders = raw.map((r, i) => ({ idx: i, rem: r - floors[i] }));

  let assigned = floors.reduce((sum, v) => sum + v, 0);
  let leftover = 100 - assigned;

  remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx);
  for (let k = 0; k < leftover && k < remainders.length; k += 1) {
    floors[remainders[k].idx] += 1;
  }

  // Enforce MIN_WEIGHT: steal from the largest allocation if any < 1.
  for (let guard = 0; guard < active.length; guard += 1) {
    const belowIdx = floors.findIndex((v) => v < MIN_WEIGHT);
    if (belowIdx < 0) break;
    let maxIdx = 0;
    for (let i = 1; i < floors.length; i += 1) {
      if (floors[i] > floors[maxIdx]) maxIdx = i;
    }
    if (floors[maxIdx] <= MIN_WEIGHT) break;
    floors[maxIdx] -= 1;
    floors[belowIdx] += 1;
  }

  const updatedActive = active.map((p, i) => ({
    ...p,
    weightPercentage: floors[i],
  }));
  const deleted = phases.filter((p) => p._pendingDelete);
  return [...updatedActive, ...deleted];
};

export const applyDeletion = (
  phases: DraftPhase[],
  id: string,
): DraftPhase[] => {
  const next = phases.map((p) =>
    p.id === id
      ? p._isNew
        ? null
        : { ...p, _pendingDelete: true }
      : p,
  );
  const filtered = next.filter((p): p is DraftPhase => p !== null);
  return recomputeWeights(renumberSequences(filtered));
};

export const applyAddition = (
  phases: DraftPhase[],
  newPhase: Omit<DraftPhase, "sequence" | "weightPercentage">,
  insertIndex?: number,
): DraftPhase[] => {
  const active = activePhases(phases);
  const deleted = phases.filter((p) => p._pendingDelete);

  const phase: DraftPhase = {
    ...newPhase,
    suggestedDurationDays: clampMin(
      newPhase.suggestedDurationDays,
      MIN_DURATION,
    ),
    sequence: 0,
    weightPercentage: 0,
    _isNew: true,
  };

  const at =
    typeof insertIndex === "number"
      ? Math.max(0, Math.min(insertIndex, active.length))
      : active.length;
  const inserted = [...active.slice(0, at), phase, ...active.slice(at)];
  return recomputeWeights(renumberSequences([...inserted, ...deleted]));
};

export const applyDurationOverride = (
  phases: DraftPhase[],
  id: string,
  newDuration: number,
): DraftPhase[] => {
  const next = phases.map((p) =>
    p.id === id
      ? { ...p, suggestedDurationDays: clampMin(newDuration, MIN_DURATION) }
      : p,
  );
  return recomputeWeights(next);
};

export const applyTextEdit = (
  phases: DraftPhase[],
  id: string,
  field: "title" | "description",
  value: string,
): DraftPhase[] =>
  phases.map((p) => (p.id === id ? { ...p, [field]: value } : p));

export const cumulativeDayMarkers = (phases: DraftPhase[]): number[] => {
  const active = activePhases(phases).sort(
    (a, b) => a.sequence - b.sequence,
  );
  const markers: number[] = [];
  let running = 0;
  for (const p of active) {
    running += clampMin(p.suggestedDurationDays, MIN_DURATION);
    markers.push(running);
  }
  return markers;
};

export const totalWeight = (phases: DraftPhase[]): number =>
  activePhases(phases).reduce((sum, p) => sum + (p.weightPercentage || 0), 0);

export const totalDurationDays = (phases: DraftPhase[]): number =>
  activePhases(phases).reduce(
    (sum, p) => sum + clampMin(p.suggestedDurationDays, MIN_DURATION),
    0,
  );

export const validateDraft = (phases: DraftPhase[]): DraftValidation => {
  const active = activePhases(phases);
  if (active.length < MIN_PHASES)
    return { ok: false, reason: `At least ${MIN_PHASES} phase required.` };
  if (active.length > MAX_PHASES)
    return { ok: false, reason: `Cannot exceed ${MAX_PHASES} phases.` };

  const sequences = active.map((p) => p.sequence).sort((a, b) => a - b);
  for (let i = 0; i < sequences.length; i += 1) {
    if (sequences[i] !== i + 1)
      return { ok: false, reason: "Phase numbers must be sequential." };
  }

  for (const p of active) {
    if (!p.title.trim())
      return { ok: false, reason: "Every phase must have a title." };
    if (p.weightPercentage < MIN_WEIGHT)
      return { ok: false, reason: "Each phase must have at least 1% weight." };
    if (p.suggestedDurationDays < MIN_DURATION)
      return { ok: false, reason: "Each phase must last at least 1 day." };
  }

  const sum = active.reduce((s, p) => s + p.weightPercentage, 0);
  if (sum !== 100)
    return { ok: false, reason: `Weights must total 100% (currently ${sum}%).` };

  return { ok: true };
};
