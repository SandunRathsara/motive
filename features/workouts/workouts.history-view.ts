import { deviceOffset, type OffsetAt } from '@/lib/utils/time';
import { capitalize, formatDate, formatSet, plural } from './workouts.format';
import type { ExerciseLibraryEntry, SetEntry, WorkoutSession } from './workouts.schemas';
import type { Loadable } from './workouts.view-models';

/** Every session containing one exercise, across templates (TRN-5). Pure. */

export interface ExerciseHistoryContent {
  exerciseId: string;
  name: string;
  muscleGroupLabel: string;
  sessionCountText: string;
  sessions: {
    sessionId: string;
    templateName: string;
    dateText: string;
    /** "80 × 9, 80 × 9, 80 × 8". */
    setsText: string;
    warmupText: string | null;
  }[];
}

export type ExerciseHistoryViewModel = Loadable<ExerciseHistoryContent>;

export function buildExerciseHistory(
  exerciseId: string, exercise: ExerciseLibraryEntry | null,
  history: readonly { session: WorkoutSession; sets: readonly SetEntry[] }[], offsetAt: OffsetAt = deviceOffset,
): ExerciseHistoryContent {
  const join = (sets: readonly SetEntry[]) => sets.map((set) => formatSet(set.loadKg, set.reps)).join(', ');
  return {
    exerciseId, name: exercise?.name ?? exerciseId, muscleGroupLabel: capitalize(exercise?.muscleGroup ?? 'other'),
    sessionCountText: plural(history.length, 'session'),
    sessions: history.map(({ session, sets }) => {
      const ordered = [...sets].sort((a, b) => a.index - b.index);
      const working = ordered.filter((set) => set.type === 'working');
      const warmups = ordered.filter((set) => set.type === 'warmup');
      return {
        sessionId: session.id, templateName: session.prescription.templateName, dateText: formatDate(session.startedAt, offsetAt),
        setsText: working.length ? join(working) : 'Warmups only', warmupText: warmups.length ? `Warmup ${join(warmups)}` : null,
      };
    }),
  };
}
