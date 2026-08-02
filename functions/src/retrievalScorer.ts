// Retrieval scorer for milestone generation, Phase 1b. Pure, not wired.
//
// Given a project (name, components[], isComposite, windowDays) and the SME
// corpus, returns the top-k exemplar indices, a matchMode label, a novelty
// score, and a full per-entry breakdown for inspection. No side effects, no
// Firestore, no Anthropic, no imports from index.ts.
//
// The corpus is imported from ./data with the SME entries and their component
// tags as the default. Callers may inject an alternate corpus for testing.
// Wiring into generateMilestones happens in Phase 1c.

import { SME_PROJECTS, type SmeProject } from "./data/dataset";
import { SME_COMPONENTS } from "./data/corpusComponents";

// ---------- Tunable constants (exported so tests can reference them) ----------

export const W_COMPONENT = 0.55;
export const W_LEXICAL = 0.25;
export const W_DURATION = 0.20;

export const MMR_LAMBDA = 0.15;
export const MAX_PICKS = 3;

export const NOISE_FLOOR = 0.15;
export const FALLBACK_THRESHOLD = 0.22;
export const ESCALATION_THRESHOLD = 0.30;
export const NEAR_DUPLICATE_LEXICAL_THRESHOLD = 0.9;
export const DURATION_ESCALATION_PCT = 0.30;
export const PRIMARY_PENALTY_FACTOR = 0.5;

// ---------- Vocabularies ----------

const STOPWORDS: ReadonlySet<string> = new Set([
  "of", "the", "with", "and", "for", "in", "to", "a", "an",
  "on", "at", "by", "from", "or", "into", "as", "per",
]);

// Per Phase 1 plan: penalty applies only when the exemplar's PRIMARY component
// is in this set AND is not in the project's components. Restricts the penalty
// to visibly-distinct works so water-adjacent primaries like "waterworks" do
// not get penalized when a water_tank project retrieves them.
const VISIBLY_DISTINCT_PRIMARY: ReadonlySet<string> = new Set([
  "bridge", "footbridge", "riprap", "perimeter_fence",
  "day_care", "covered_court", "covered_walk",
]);

// ---------- Types ----------

export type MatchMode = "exact" | "variant" | "composite" | "analogous" | "novel";

export type ScorerInput = {
  projectName: string;
  components: string[];
  isComposite: boolean;
  windowDays: number | null;
};

export type ScorerCorpus = {
  projects: ReadonlyArray<Pick<SmeProject, "name" | "total">>;
  components: ReadonlyArray<ReadonlyArray<string>>;
};

export type EntryBreakdown = {
  index: number;
  name: string;
  total: number;
  components: readonly string[];
  cScore: number;
  lScore: number;
  dScore: number;
  baseScore: number;
  primaryPenaltyApplied: boolean;
  finalBaseScore: number;
  collapsedInto: number | null;
  picked: boolean;
  marginalAtPick: number | null;
  addedByEscalation: boolean;
};

export type ScorerResult = {
  pickedIndices: number[];
  matchMode: MatchMode;
  noveltyScore: number;
  escalationApplied: boolean;
  fallbackApplied: boolean;
  scoreBreakdown: EntryBreakdown[];
};

// ---------- Pure helpers ----------

export function tokenize(name: string): Set<string> {
  const raw = name.toLowerCase().split(/[^a-z0-9]+/);
  return new Set(raw.filter((t) => t.length > 0 && !STOPWORDS.has(t)));
}

export function jaccard<T>(a: Iterable<T>, b: Iterable<T>): number {
  const setA = a instanceof Set ? (a as Set<T>) : new Set<T>(a);
  const setB = b instanceof Set ? (b as Set<T>) : new Set<T>(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function durationProximity(entryTotal: number, windowDays: number | null): number {
  if (windowDays === null || windowDays <= 0) return 0.5;
  const diff = Math.abs(entryTotal - windowDays);
  const denom = Math.max(windowDays, 30);
  return 1 / (1 + diff / denom);
}

export function baseScoreOf(cScore: number, lScore: number, dScore: number): number {
  return W_COMPONENT * cScore + W_LEXICAL * lScore + W_DURATION * dScore;
}

// ---------- Main ----------

export function scoreProject(input: ScorerInput, corpus?: ScorerCorpus): ScorerResult {
  const c: ScorerCorpus =
    corpus ?? { projects: SME_PROJECTS, components: SME_COMPONENTS };

  if (c.projects.length !== c.components.length) {
    throw new Error(
      `retrievalScorer: corpus mismatch, ${c.projects.length} projects vs ${c.components.length} component lists`,
    );
  }

  const pTokens = tokenize(input.projectName);
  const pCompsSet = new Set<string>(input.components);

  type Scored = {
    index: number;
    name: string;
    total: number;
    comps: readonly string[];
    cScore: number;
    lScore: number;
    dScore: number;
    baseScore: number;
    primaryPenaltyApplied: boolean;
    finalBaseScore: number;
  };

  // Score every entry.
  const scored: Scored[] = c.projects.map((entry, index) => {
    const comps = c.components[index];
    const cScore = jaccard(pCompsSet, comps);
    const lScore = jaccard(pTokens, tokenize(entry.name));
    const dScore = durationProximity(entry.total, input.windowDays);
    const base = baseScoreOf(cScore, lScore, dScore);

    let penaltyApplied = false;
    let finalBase = base;
    if (comps.length > 0) {
      const primary = comps[0];
      if (VISIBLY_DISTINCT_PRIMARY.has(primary) && !pCompsSet.has(primary)) {
        finalBase = base * PRIMARY_PENALTY_FACTOR;
        penaltyApplied = true;
      }
    }

    return {
      index,
      name: entry.name,
      total: entry.total,
      comps,
      cScore,
      lScore,
      dScore,
      baseScore: base,
      primaryPenaltyApplied: penaltyApplied,
      finalBaseScore: finalBase,
    };
  });

  // Near-duplicate collapse: pairs with lexical Jaccard >= threshold AND
  // identical component sets. From each group keep the entry with highest
  // dScore (closest to windowDays), ties broken by lower index.
  const collapsed = new Map<number, number>(); // collapsed idx -> survivor idx
  const consumed = new Set<number>();
  const survivorIndices = new Set<number>();

  for (let i = 0; i < scored.length; i += 1) {
    if (consumed.has(scored[i].index)) continue;
    const group: Scored[] = [scored[i]];
    const iTokens = tokenize(scored[i].name);
    const iCompsSet = new Set<string>(scored[i].comps);

    for (let j = i + 1; j < scored.length; j += 1) {
      if (consumed.has(scored[j].index)) continue;
      const jTokens = tokenize(scored[j].name);
      const lex = jaccard(iTokens, jTokens);
      if (lex < NEAR_DUPLICATE_LEXICAL_THRESHOLD) continue;
      const jCompsSet = new Set<string>(scored[j].comps);
      if (jCompsSet.size !== iCompsSet.size) continue;
      let compsMatch = true;
      for (const x of iCompsSet) {
        if (!jCompsSet.has(x)) {
          compsMatch = false;
          break;
        }
      }
      if (compsMatch) group.push(scored[j]);
    }

    if (group.length > 1) {
      group.sort((a, b) => b.dScore - a.dScore || a.index - b.index);
      const survivor = group[0];
      survivorIndices.add(survivor.index);
      consumed.add(survivor.index);
      for (const g of group.slice(1)) {
        collapsed.set(g.index, survivor.index);
        consumed.add(g.index);
      }
    } else {
      survivorIndices.add(scored[i].index);
      consumed.add(scored[i].index);
    }
  }

  const survivors = scored.filter((s) => survivorIndices.has(s.index));

  // Hard zero-overlap exclusion (fix 1). cScore == 0 means the entry is not
  // a reference exemplar for this project's components. Excluded from the
  // main pool; only path back in is analogous-weak escalation below.
  const mainPool = survivors.filter((s) => s.cScore > 0);

  // Sort main pool by finalBaseScore, tiebreak by dScore then index.
  const sortedByBase = [...mainPool].sort(
    (a, b) =>
      b.finalBaseScore - a.finalBaseScore ||
      b.dScore - a.dScore ||
      a.index - b.index,
  );

  const pickedEntries: Scored[] = [];
  const marginalAtPick = new Map<number, number>();
  const escalationCandidateIndices = new Set<number>();
  let escalationApplied = false;
  let fallbackApplied = false;

  // Shared MMR marginal picker. Ties: (1) higher marginal, (2) higher
  // finalBaseScore, (3) higher dScore, (4) lower index.
  const pickMmrIndex = (
    candidates: Scored[],
    picked: Scored[],
  ): { idx: number; marginal: number } => {
    let bestIdx = -1;
    let bestMarginal = -Infinity;
    let bestBase = -Infinity;
    let bestD = -Infinity;
    let bestEntryIdx = Number.POSITIVE_INFINITY;
    for (let i = 0; i < candidates.length; i += 1) {
      const e = candidates[i];
      let maxSim = 0;
      for (const p of picked) {
        const sim = jaccard(new Set(e.comps), new Set(p.comps));
        if (sim > maxSim) maxSim = sim;
      }
      const marginal = (1 - MMR_LAMBDA) * e.finalBaseScore + MMR_LAMBDA * (1 - maxSim);
      const better =
        marginal > bestMarginal ||
        (marginal === bestMarginal && e.finalBaseScore > bestBase) ||
        (marginal === bestMarginal && e.finalBaseScore === bestBase && e.dScore > bestD) ||
        (marginal === bestMarginal &&
          e.finalBaseScore === bestBase &&
          e.dScore === bestD &&
          e.index < bestEntryIdx);
      if (better) {
        bestIdx = i;
        bestMarginal = marginal;
        bestBase = e.finalBaseScore;
        bestD = e.dScore;
        bestEntryIdx = e.index;
      }
    }
    return { idx: bestIdx, marginal: bestMarginal };
  };

  // Top pick candidate from main pool. If below FALLBACK_THRESHOLD (fix 5)
  // OR main pool empty, fall back to closest-by-duration from full corpus.
  const topCandidate = sortedByBase.length > 0 ? sortedByBase[0] : null;
  const topCandidateScore = topCandidate?.finalBaseScore ?? 0;

  if (topCandidateScore < FALLBACK_THRESHOLD) {
    fallbackApplied = true;
    if (input.windowDays !== null && scored.length > 0) {
      let closest = scored[0];
      let closestDiff = Math.abs(closest.total - input.windowDays);
      for (const e of scored.slice(1)) {
        const diff = Math.abs(e.total - input.windowDays);
        if (
          diff < closestDiff ||
          (diff === closestDiff && e.index < closest.index)
        ) {
          closest = e;
          closestDiff = diff;
        }
      }
      pickedEntries.push(closest);
      marginalAtPick.set(closest.index, closest.finalBaseScore);
    }
  } else {
    // Pick 1: top of main pool.
    const anchor = topCandidate as Scored;
    pickedEntries.push(anchor);
    marginalAtPick.set(anchor.index, anchor.finalBaseScore);

    // Fill remaining slots from main pool leftovers first via MMR (fix 6).
    // Main pool always has priority; escalation only supplements when this
    // loop cannot fill the remaining slots. Component relevance beats
    // duration proximity in slot ordering; an LLM learns bridge phase
    // structure from a bridge at the wrong duration, nothing transferable
    // from an electrical upgrade at the right duration.
    const remaining = sortedByBase.slice(1);
    while (pickedEntries.length < MAX_PICKS && remaining.length > 0) {
      const { idx, marginal } = pickMmrIndex(remaining, pickedEntries);
      if (idx < 0) break;
      if (remaining[idx].finalBaseScore < NOISE_FLOOR) break;
      pickedEntries.push(remaining[idx]);
      marginalAtPick.set(remaining[idx].index, marginal);
      remaining.splice(idx, 1);
    }

    // Escalation supplements only after main pool is exhausted (fix 6). Fires
    // only when top score signals weak retrieval AND slots remain to fill.
    // Escalation pool: duration-window entries NOT in main pool, above noise
    // floor (fix 4).
    const usingEscalation =
      topCandidateScore < ESCALATION_THRESHOLD &&
      input.windowDays !== null &&
      pickedEntries.length < MAX_PICKS;

    if (usingEscalation) {
      escalationApplied = true;
      const windowLo = input.windowDays! * (1 - DURATION_ESCALATION_PCT);
      const windowHi = input.windowDays! * (1 + DURATION_ESCALATION_PCT);
      const mainPoolIdxSet = new Set(mainPool.map((s) => s.index));
      const escPool: Scored[] = survivors.filter(
        (e) =>
          !mainPoolIdxSet.has(e.index) &&
          e.index !== anchor.index &&
          e.total >= windowLo &&
          e.total <= windowHi &&
          e.finalBaseScore >= NOISE_FLOOR,
      );
      while (pickedEntries.length < MAX_PICKS && escPool.length > 0) {
        const { idx, marginal } = pickMmrIndex(escPool, pickedEntries);
        if (idx < 0) break;
        pickedEntries.push(escPool[idx]);
        marginalAtPick.set(escPool[idx].index, marginal);
        escalationCandidateIndices.add(escPool[idx].index);
        escPool.splice(idx, 1);
      }
    }
  }

  const pickedIndices: number[] = pickedEntries.map((p) => p.index);

  // matchMode derivation. Fallback path is always "novel".
  let matchMode: MatchMode;
  let noveltyScore: number;
  if (fallbackApplied || pickedEntries.length === 0) {
    matchMode = "novel";
    noveltyScore = 1.0;
  } else {
    const topEntry = pickedEntries[0];
    const topScore = topEntry.finalBaseScore;
    if (input.isComposite && topScore >= 0.4) {
      matchMode = "composite";
    } else if (topEntry.lScore >= 0.9 && topEntry.cScore >= 0.8) {
      matchMode = "exact";
    } else if (topEntry.lScore >= 0.5 && topEntry.cScore >= 0.5) {
      matchMode = "variant";
    } else {
      matchMode = "analogous";
    }
    noveltyScore = Math.max(0, Math.min(1, 1 - topScore));
  }

  const pickedSet = new Set(pickedIndices);
  const scoreBreakdown: EntryBreakdown[] = scored.map((e) => ({
    index: e.index,
    name: e.name,
    total: e.total,
    components: e.comps,
    cScore: e.cScore,
    lScore: e.lScore,
    dScore: e.dScore,
    baseScore: e.baseScore,
    primaryPenaltyApplied: e.primaryPenaltyApplied,
    finalBaseScore: e.finalBaseScore,
    collapsedInto: collapsed.get(e.index) ?? null,
    picked: pickedSet.has(e.index),
    marginalAtPick: marginalAtPick.get(e.index) ?? null,
    addedByEscalation: escalationCandidateIndices.has(e.index),
  }));

  return {
    pickedIndices,
    matchMode,
    noveltyScore,
    escalationApplied,
    fallbackApplied,
    scoreBreakdown,
  };
}
