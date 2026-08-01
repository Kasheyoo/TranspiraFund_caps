import type { Milestone } from "../types";

// Cap on generated/confirmed plan phase count. Used by validateDraft's upper
// bound, applyAddition's overflow guard, and the truncation banner copy in
// MilestoneGenerationModal.tsx.
//
// Cross-boundary twin: MAX_PHASES_PER_PLAN in functions/src/index.ts holds the
// same value on the server and cannot import across the RN/functions boundary.
// Keep the two in lockstep; a divergence would misreport the cap in the banner
// text and could produce drafts the server rejects at confirm.
export const MAX_PHASES = 12;
export const MIN_PHASES = 1;
export const MIN_WEIGHT = 1;
export const MIN_DURATION = 1;

// Server mirror of computeProjectWindowDays() in functions/src/index.ts.
// Keep the field order, fallback aliases, and the null-on-missing-or-nonpositive
// contract identical — the redistribution basis, the server's scaling basis,
// and the header indicator all read the same value.
export const computeProjectWindowDaysClient = (project: {
  officialDateStarted?: string | null;
  startDate?: string | null;
  originalDateCompletion?: string | null;
  completionDate?: string | null;
}): number | null => {
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const start = str(project.officialDateStarted) || str(project.startDate);
  const end =
    str(project.originalDateCompletion) || str(project.completionDate);
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  return days > 0 ? days : null;
};

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

export type TitleCheck = { ok: true } | { ok: false; reason: string };

// Structural (Layer A) title validation. Catches gibberish and non-word input;
// cannot catch grammatically valid but unrelated titles — that is the job of
// the server-side semantic check (validateMilestoneTitle).
const GIBBERISH_REASON = "Title looks like gibberish — enter a real phase name.";
const isAcronym = (word: string): boolean => /^[A-Z]{2,6}$/.test(word);

export const checkTitleStructure = (raw: string): TitleCheck => {
  const title = raw.trim();
  if (title.length < 5) {
    return {
      ok: false,
      reason: "Title is too short — describe the phase (e.g., 'Site Clearing').",
    };
  }
  if (!/[A-Za-z]{3,}/.test(title)) {
    return {
      ok: false,
      reason: "Title must contain words, not just numbers or symbols.",
    };
  }
  if (/(.)\1{3,}/.test(title)) {
    return { ok: false, reason: GIBBERISH_REASON };
  }
  const words = title.split(/[^A-Za-z]+/).filter((w) => w.length > 0);
  for (const w of words) {
    if (isAcronym(w)) continue;
    if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)) {
      return { ok: false, reason: GIBBERISH_REASON };
    }
    if (w.length >= 4 && !/[aeiouy]/i.test(w)) {
      return { ok: false, reason: GIBBERISH_REASON };
    }
  }
  return { ok: true };
};

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

export type RedistributeOptions = {
  preserveId?: string;
  preserveValue?: number;
};

// Proportionally rescale active phase durations so their sum equals windowDays.
// Mirrors server scaleDurationsToWindow semantics: largest-remainder rounding,
// min-1 per phase, deterministic ascending-index tiebreaker. When windowDays is
// null, returns phases unchanged (null-window degradation). When options names a
// preserveId, that phase pins to preserveValue and only the remaining phases
// rescale to fit the remainder — matches the "user just typed this deliberately"
// contract on Add. On Delete, callers omit options and every survivor rescales
// by its current duration weight. Weights are recomputed here so the caller
// completes add/delete in a single state transition.
export const redistributeDurations = (
  phases: DraftPhase[],
  windowDays: number | null,
  options?: RedistributeOptions,
): DraftPhase[] => {
  if (windowDays === null) return phases;

  const active = activePhases(phases);
  const deleted = phases.filter((p) => p._pendingDelete);
  if (active.length === 0) return phases;

  const preserveId = options?.preserveId;
  const preserveIdx = preserveId
    ? active.findIndex((p) => p.id === preserveId)
    : -1;
  const rawPreserved =
    preserveIdx >= 0
      ? options?.preserveValue ?? active[preserveIdx].suggestedDurationDays
      : 0;
  const preservedClamped =
    preserveIdx >= 0
      ? Math.min(999, Math.max(MIN_DURATION, Math.floor(rawPreserved)))
      : 0;

  const otherIdxs: number[] = [];
  for (let i = 0; i < active.length; i += 1) {
    if (i !== preserveIdx) otherIdxs.push(i);
  }
  const otherCount = otherIdxs.length;

  if (otherCount === 0) {
    const only = active.map((p, i) =>
      i === preserveIdx
        ? { ...p, suggestedDurationDays: preservedClamped }
        : { ...p, suggestedDurationDays: windowDays },
    );
    return recomputeWeights(renumberSequences([...only, ...deleted]));
  }

  const remainder = windowDays - preservedClamped;

  // Window-too-small edge (matches server's `windowDays < n` branch): every
  // "other" clamps to 1 and the indicator surfaces the overflow.
  if (remainder < otherCount) {
    const updated = active.map((p, i) =>
      i === preserveIdx
        ? { ...p, suggestedDurationDays: preservedClamped }
        : { ...p, suggestedDurationDays: MIN_DURATION },
    );
    return recomputeWeights(renumberSequences([...updated, ...deleted]));
  }

  const others = otherIdxs.map((i) => active[i]);
  const currentDays = others.map((p) =>
    Number.isFinite(p.suggestedDurationDays) && p.suggestedDurationDays > 0
      ? p.suggestedDurationDays
      : 1,
  );
  const totalCurrent = currentDays.reduce((s, d) => s + d, 0);

  let allocated: number[];
  if (totalCurrent <= 0) {
    const base = Math.floor(remainder / otherCount);
    const leftover = remainder - base * otherCount;
    allocated = new Array<number>(otherCount).fill(base);
    for (let i = 0; i < leftover; i += 1) allocated[i] += 1;
  } else {
    const raw = currentDays.map((d) => (d / totalCurrent) * remainder);
    const floors = raw.map((r) => Math.floor(r));
    const remainders = raw.map((r, i) => ({ idx: i, rem: r - floors[i] }));
    const leftover = remainder - floors.reduce((s, v) => s + v, 0);
    remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx);
    for (let k = 0; k < leftover && k < remainders.length; k += 1) {
      floors[remainders[k].idx] += 1;
    }
    // Enforce min=1: steal from the largest allocation if any phase < 1.
    for (let guard = 0; guard < otherCount; guard += 1) {
      const belowIdx = floors.findIndex((v) => v < MIN_DURATION);
      if (belowIdx < 0) break;
      let maxIdx = 0;
      for (let i = 1; i < floors.length; i += 1) {
        if (floors[i] > floors[maxIdx]) maxIdx = i;
      }
      if (floors[maxIdx] <= MIN_DURATION) break;
      floors[maxIdx] -= 1;
      floors[belowIdx] += 1;
    }
    allocated = floors;
  }

  const allocByActiveIdx = new Map<number, number>();
  for (let j = 0; j < otherIdxs.length; j += 1) {
    allocByActiveIdx.set(otherIdxs[j], allocated[j]);
  }
  const updatedActive = active.map((p, i) =>
    i === preserveIdx
      ? { ...p, suggestedDurationDays: preservedClamped }
      : { ...p, suggestedDurationDays: allocByActiveIdx.get(i) ?? MIN_DURATION },
  );

  return recomputeWeights(renumberSequences([...updatedActive, ...deleted]));
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

// Pure extraction of the Confirm-All flush loop. Given a snapshot of the
// per-phase raw duration buffer, commit each parseable value into the draft
// via applyDurationOverride, preserving the same 1..999 clamp and NaN skip
// behavior as the original inline loop. Callers are responsible for clearing
// the buffer state after invoking this — the helper is pure.
export const flushDurationBuffers = (
  phases: DraftPhase[],
  buffers: Record<string, string>,
): DraftPhase[] => {
  let flushed = phases;
  for (const id of Object.keys(buffers)) {
    const cleaned = buffers[id].replace(/[^0-9]/g, "");
    const parsed = cleaned === "" ? NaN : parseInt(cleaned, 10);
    if (!Number.isFinite(parsed)) continue;
    const num = Math.min(999, Math.max(1, parsed));
    flushed = applyDurationOverride(flushed, id, num);
  }
  return flushed;
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
    const titleCheck = checkTitleStructure(p.title);
    if (!titleCheck.ok)
      return { ok: false, reason: `Phase ${p.sequence}: ${titleCheck.reason}` };
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
