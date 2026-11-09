import { getExerciseById } from './workouts.content';
import type { ProgressionOutcome, ProgressionPrescription, ProgressionSession } from './workouts.progression';
import type { NextTimeOutcome } from './workouts.summary';
import type { SetEntry, TemplateExercise, WorkoutSession } from './workouts.schemas';

/**
 * Pure glue between stored sessions and the rule modules: it builds progression input from finished
 * sessions and adapts a progression outcome to the summary's "next time" input. No I/O, no Health data.
 */
export type SessionWithSets = WorkoutSession & { sets: SetEntry[] };

export const defaultRestSeconds = 90;

export function restSecondsFor(templateExercise: Pick<TemplateExercise, 'restOverrideSeconds'>): number {
  return templateExercise.restOverrideSeconds ?? defaultRestSeconds;
}

export function isBodyweight(exerciseId: string): boolean {
  return getExerciseById(exerciseId)?.bodyweight ?? false;
}

export function progressionPrescription(templateExercise: TemplateExercise): ProgressionPrescription {
  return {
    workingSets: templateExercise.workingSets, repRange: templateExercise.repRange,
    incrementKg: templateExercise.incrementKg, bodyweight: isBodyweight(templateExercise.exerciseId),
  };
}

/**
 * Ordered history of one Template Exercise from finished sessions (oldest first). Each entry carries the
 * prescription frozen when that session started (PLAN-7), and the Deload flag so the rules skip it.
 */
export function progressionHistory(sessions: readonly SessionWithSets[], templateExerciseId: string): ProgressionSession[] {
  return [...sessions]
    .filter((session) => session.endedAt !== null)
    .sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id))
    .flatMap((session) => {
      const frozen = session.prescription.exercises.find((exercise) => exercise.id === templateExerciseId);
      if (!frozen) return [];
      return [{
        id: session.id, deload: session.deload, prescription: progressionPrescription(frozen),
        sets: session.sets.filter((set) => set.templateExerciseId === templateExerciseId)
          .sort((a, b) => a.index - b.index)
          .map(({ type, loadKg, reps }) => ({ type, loadKg, reps })),
      }];
    });
}

export function toNextTimeOutcome(outcome: ProgressionOutcome, exerciseName: string): NextTimeOutcome {
  switch (outcome.type) {
    case 'progress': return { exerciseName, kind: 'progress', loadKg: outcome.loadKg, reps: outcome.reps, failedSets: 0 };
    case 'load-reset': return { exerciseName, kind: 'loadReset', loadKg: outcome.loadKg, reps: outcome.reps, failedSets: 0 };
    case 'repeat': return { exerciseName, kind: 'repeat', loadKg: outcome.loadKg, reps: outcome.reps, failedSets: outcome.failedSetCount };
  }
}
