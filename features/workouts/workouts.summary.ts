import { isSessionCompleted } from './workouts.schedule';

/**
 * Pure session-summary rules (TRN-8, G5). Volume sums load × reps of loaded working
 * sets only; bodyweight working sets count toward sets per muscle group and a
 * separate reps total. Nothing here reads Health data.
 */
export type SummarySet = { exerciseId: string; type: 'working' | 'warmup'; loadKg: number | null; reps: number };
export type SummarySession = {
  id: string; templateId: string; startedAt: number; endedAt: number | null; sets: readonly SummarySet[];
};
export type ExerciseLookup = (exerciseId: string) => { muscleGroup: string; bodyweight: boolean } | undefined;

export type SessionSummary = {
  volumeKg: number;
  workingSets: number;
  /** Reps from working sets with no load (bodyweight). */
  bodyweightReps: number;
  setsByMuscleGroup: { muscleGroup: string; sets: number }[];
};

/** Round away binary floating-point noise (loads are at most two decimals). */
const round = (value: number) => Math.round(value * 100) / 100;

export function summarizeSession(session: Pick<SummarySession, 'sets'>, lookup: ExerciseLookup): SessionSummary {
  let volumeKg = 0, workingSets = 0, bodyweightReps = 0;
  const groups = new Map<string, number>();
  for (const set of session.sets) {
    if (set.type !== 'working') continue;
    workingSets++;
    if (set.loadKg === null) bodyweightReps += set.reps;
    else volumeKg += set.loadKg * set.reps;
    const group = lookup(set.exerciseId)?.muscleGroup;
    if (group) groups.set(group, (groups.get(group) ?? 0) + 1);
  }
  return {
    volumeKg: round(volumeKg), workingSets, bodyweightReps,
    setsByMuscleGroup: [...groups].map(([muscleGroup, sets]) => ({ muscleGroup, sets }))
      .sort((a, b) => b.sets - a.sets || a.muscleGroup.localeCompare(b.muscleGroup)),
  };
}

/** The latest earlier completed session of the same template (TRN-8). */
export function previousCompletedSession<S extends SummarySession>(session: SummarySession, sessions: readonly S[]): S | null {
  let previous: S | null = null;
  for (const candidate of sessions) {
    if (candidate.id === session.id || candidate.templateId !== session.templateId) continue;
    if (candidate.startedAt >= session.startedAt || !isSessionCompleted(candidate)) continue;
    if (!previous || candidate.startedAt > previous.startedAt) previous = candidate;
  }
  return previous;
}

export type SessionComparison = {
  previousVolumeKg: number;
  volumeDeltaKg: number;
  workingSetsDelta: number;
  bodyweightRepsDelta: number;
};

export function compareWithPrevious(current: SessionSummary, previous: SessionSummary | null): SessionComparison | null {
  if (!previous) return null;
  return {
    previousVolumeKg: previous.volumeKg,
    volumeDeltaKg: round(current.volumeKg - previous.volumeKg),
    workingSetsDelta: current.workingSets - previous.workingSets,
    bodyweightRepsDelta: current.bodyweightReps - previous.bodyweightReps,
  };
}

/**
 * Structural view of a progression outcome (ticket B owns the real type; the
 * workout service adapts it to this shape). `loadKg` is null for bodyweight.
 */
export type NextTimeOutcome = {
  exerciseName: string;
  kind: 'progress' | 'repeat' | 'loadReset' | 'firstUse';
  loadKg: number | null;
  reps: number;
  failedSets: number;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const target = (outcome: NextTimeOutcome) => outcome.loadKg === null ? plural(outcome.reps, 'rep') : `${round(outcome.loadKg)} × ${outcome.reps}`;

function describe(outcome: NextTimeOutcome): string | null {
  switch (outcome.kind) {
    case 'firstUse': return null;
    case 'progress': return `${outcome.exerciseName} moves to ${target(outcome)}`;
    case 'loadReset': return `${outcome.exerciseName} resets to ${target(outcome)}`;
    case 'repeat': {
      const what = outcome.loadKg === null ? plural(outcome.reps, 'rep') : `${round(outcome.loadKg)} kg`;
      const failed = outcome.failedSets > 0 ? ` after ${plural(outcome.failedSets, 'Failed Set')}` : '';
      return `${outcome.exerciseName} repeats ${what}${failed}`;
    }
  }
}

/** The one deterministic "next time" line; null when nothing has an outcome to report. */
export function nextTimeLine(outcomes: readonly NextTimeOutcome[]): string | null {
  const parts = outcomes.map(describe).filter((part): part is string => part !== null);
  return parts.length ? parts.join('; ') : null;
}
