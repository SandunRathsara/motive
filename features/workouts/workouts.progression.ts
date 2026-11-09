/**
 * Double progression, Failed Set, Stall and Load Reset (TRN-4/5/6).
 *
 * Pure and deterministic: the only inputs are a Template Exercise's prescription and its finished-session
 * history (load and reps). There is deliberately no Health Signal input (TRN-11); the architecture check
 * forbids importing `features/health` here. Progression state is rebuilt by replaying the history, so
 * edits and deletions of past sessions recompute exactly like a fresh finish (TRN-9).
 */

export interface ProgressionPrescription {
  workingSets: number;
  repRange: { min: number; max: number };
  incrementKg: number;
  bodyweight: boolean;
}

export interface ProgressionSet {
  type: 'working' | 'warmup';
  /** Null for bodyweight (reps-only) sets. */
  loadKg: number | null;
  reps: number;
}

export interface ProgressionSession {
  id: string;
  /** Sets of this exercise in set-index order. */
  sets: readonly ProgressionSet[];
  /** Deload sessions are excluded from progression history (TRN-10). */
  deload?: boolean;
  /** Prescription frozen when the session started (PLAN-7). Defaults to the current prescription. */
  prescription?: ProgressionPrescription;
}

export interface RecommendedSet { loadKg: number | null; reps: number }
export interface ActualSet { loadKg: number | null; reps: number }

export type StallKind = 'failed-sets' | 'no-rep-gain';
export interface StallEvent { sessionId: string; kind: StallKind }

export interface LoadReset {
  kind: StallKind;
  /** Number of consecutive sessions that caused the Stall (2 Failed-Set sessions, 3 no-gain sessions). */
  sessions: number;
  fromKg: number;
  toKg: number;
  minReps: number;
  reasonLine: string;
}

export interface SessionProgressionEvaluation {
  sessionId: string;
  /** Recommended (or, on first use, reference) load this session was judged against; null for bodyweight. */
  recommendedLoadKg: number | null;
  /** Indexes of prescribed working sets that were Failed Sets. */
  failedSetIndexes: number[];
  /** Total reps across prescribed working sets at or above the recommended load (TRN-6 no-rep-gain metric). */
  totalReps: number;
  progressed: boolean;
}

/** What happened after the latest session, for the "next time" line (TRN-8). */
export type ProgressionOutcome =
  | { type: 'progress'; sessionId: string; fromKg: number; loadKg: number; reps: number }
  | { type: 'repeat'; sessionId: string; loadKg: number | null; reps: number; failedSetCount: number }
  | { type: 'load-reset'; sessionId: string; fromKg: number; loadKg: number; reps: number; reasonLine: string };

export interface StallState {
  /** Consecutive sessions with a Failed Set, since the last Load Reset. */
  failedSessionStreak: number;
  /** Consecutive sessions at one recommended load with no rep gain, since the last Load Reset. */
  noRepGainStreak: number;
  events: StallEvent[];
}

export interface ProgressionResult {
  /** One per prescribed working set; null on first use (no finished history). */
  recommendedSets: RecommendedSet[] | null;
  /** Working sets of the most recent non-Deload session, by index, for "last 80 × 9" secondary text. */
  lastSets: ActualSet[];
  /** One per non-Deload history session in which the exercise had a working set. */
  sessions: SessionProgressionEvaluation[];
  sessionCount: number;
  stall: StallState;
  /** Set only while the current recommendation is a Load Reset. */
  loadReset: LoadReset | null;
  outcome: ProgressionOutcome | null;
}

const EPSILON = 1e-9;
const roundKg = (value: number) => Math.round(value * 1000) / 1000;
const sameLoad = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) < EPSILON;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** About −10%, rounded down to the increment; never above the current load nor below one increment. */
function loadResetKg(loadKg: number, incrementKg: number): number {
  const reduced = loadKg * 0.9;
  const rounded = incrementKg > 0 ? Math.floor(reduced / incrementKg + EPSILON) * incrementKg : Math.floor(reduced * 100) / 100;
  return roundKg(Math.min(loadKg, Math.max(rounded, incrementKg)));
}

/** Resizes to the prescribed set count, copying the last set when growing. */
function fit<T>(values: readonly T[], count: number): T[] {
  return Array.from({ length: count }, (_, index) => values[Math.min(index, values.length - 1)] as T);
}

interface Recommendation { loadKg: number | null; reps: number[] }

export function computeProgression(prescription: ProgressionPrescription, history: readonly ProgressionSession[]): ProgressionResult {
  const { bodyweight } = prescription;
  const performed = history
    .filter((entry) => !entry.deload)
    .map((entry) => ({ entry, working: entry.sets.filter((set) => set.type === 'working') }))
    .filter(({ working }) => working.length > 0);

  let recommendation = null as Recommendation | null;
  let failedStreak = 0;
  let noGain: { loadKg: number | null; lastTotal: number; count: number } = { loadKg: null, lastTotal: 0, count: 0 };
  const evaluations: SessionProgressionEvaluation[] = [];
  const events: StallEvent[] = [];
  let loadReset: LoadReset | null = null;
  let outcome: ProgressionOutcome | null = null;
  let lastRange: ProgressionPrescription['repRange'] | null = null;

  for (const [position, { entry, working }] of performed.entries()) {
    const isLatest = position === performed.length - 1;
    const snapshot = entry.prescription ?? prescription;
    const { min, max } = snapshot.repRange;
    // The next step uses the current increment; every earlier step uses the one in force at the time.
    const incrementKg = isLatest ? prescription.incrementKg : snapshot.incrementKg;
    const prescribed = working.slice(0, snapshot.workingSets);

    const previous: Recommendation | null = recommendation === null ? null : { loadKg: recommendation.loadKg, reps: fit(recommendation.reps, snapshot.workingSets) };
    // First use: the reference load is the first prescribed working set's logged load (TRN-5).
    const referenceKg: number | null = bodyweight ? null : previous?.loadKg ?? prescribed[0]?.loadKg ?? null;
    if (!bodyweight && referenceKg === null) continue;

    const counted = Array.from({ length: snapshot.workingSets }, (_, index): ProgressionSet | null => {
      const set = prescribed[index];
      if (!set) return null;
      if (bodyweight) return set;
      return set.loadKg !== null && referenceKg !== null && set.loadKg >= referenceKg - EPSILON ? set : null;
    });
    const failedSetIndexes = counted.flatMap((set, index) => (set && set.reps < min ? [index] : []));
    const totalReps = counted.reduce((sum, set) => sum + (set?.reps ?? 0), 0);
    const complete = counted.every((set) => set !== null);
    const progressed = !bodyweight && complete && counted.every((set) => set !== null && set.reps >= max);
    evaluations.push({ sessionId: entry.id, recommendedLoadKg: referenceKg, failedSetIndexes, totalReps, progressed });

    // Stall counters (never for bodyweight).
    let stallKind: StallKind | null = null;
    let stallSessions = 0;
    if (!bodyweight) {
      failedStreak = failedSetIndexes.length > 0 ? failedStreak + 1 : 0;
      noGain = sameLoad(noGain.loadKg, referenceKg) && noGain.count > 0
        ? { loadKg: referenceKg, lastTotal: totalReps, count: totalReps <= noGain.lastTotal ? noGain.count + 1 : 1 }
        : { loadKg: referenceKg, lastTotal: totalReps, count: 1 };
      if (!progressed) {
        if (failedStreak >= 2) { stallKind = 'failed-sets'; stallSessions = failedStreak; }
        else if (noGain.count >= 3) { stallKind = 'no-rep-gain'; stallSessions = noGain.count; }
      }
    }

    let nextLoadKg: number | null = referenceKg;
    let nextReps: number[];
    loadReset = null;
    if (stallKind && referenceKg !== null) {
      nextLoadKg = loadResetKg(referenceKg, incrementKg);
      nextReps = Array.from({ length: snapshot.workingSets }, () => min);
      loadReset = {
        kind: stallKind, sessions: stallSessions, fromKg: referenceKg, toKg: nextLoadKg, minReps: min,
        reasonLine: stallKind === 'failed-sets'
          ? `Reset after ${stallSessions} sessions under ${min} reps`
          : `Reset after ${stallSessions} sessions with no rep gain`,
      };
      events.push({ sessionId: entry.id, kind: stallKind });
      failedStreak = 0;
      noGain = { loadKg: null, lastTotal: 0, count: 0 };
    } else if (progressed && referenceKg !== null) {
      nextLoadKg = roundKg(referenceKg + incrementKg);
      nextReps = Array.from({ length: snapshot.workingSets }, () => min);
    } else {
      // Counted sets: actual reps + 1 within the range. Others keep their previous Recommended Set (no +1).
      nextReps = counted.map((set, index) => clamp(set ? set.reps + 1 : previous?.reps[index] ?? min, min, max));
    }

    recommendation = { loadKg: nextLoadKg, reps: nextReps };
    lastRange = snapshot.repRange;

    const firstReps = nextReps[0] ?? min;
    if (loadReset && referenceKg !== null && nextLoadKg !== null) {
      outcome = { type: 'load-reset', sessionId: entry.id, fromKg: referenceKg, loadKg: nextLoadKg, reps: firstReps, reasonLine: loadReset.reasonLine };
    } else if (progressed && referenceKg !== null && nextLoadKg !== null) {
      outcome = { type: 'progress', sessionId: entry.id, fromKg: referenceKg, loadKg: nextLoadKg, reps: firstReps };
    } else {
      outcome = { type: 'repeat', sessionId: entry.id, loadKg: nextLoadKg, reps: firstReps, failedSetCount: failedSetIndexes.length };
    }
  }

  const rangeChanged = lastRange !== null
    && (lastRange.min !== prescription.repRange.min || lastRange.max !== prescription.repRange.max);
  const recommendedSets = recommendation === null ? null
    : fit(rangeChanged ? recommendation.reps.map(() => prescription.repRange.min) : recommendation.reps, prescription.workingSets)
      .map((reps) => ({ loadKg: recommendation?.loadKg ?? null, reps }));
  if (outcome && rangeChanged && recommendedSets?.[0]) outcome = { ...outcome, reps: recommendedSets[0].reps };

  const latest = performed.at(-1);
  return {
    recommendedSets,
    lastSets: latest ? latest.working.map((set) => ({ loadKg: set.loadKg, reps: set.reps })) : [],
    sessions: evaluations,
    sessionCount: evaluations.length,
    stall: { failedSessionStreak: failedStreak, noRepGainStreak: noGain.count, events },
    loadReset,
    outcome,
  };
}
