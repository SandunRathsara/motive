import type { ProgressionSession } from './workouts.progression';
import { computeProgression } from './workouts.progression';
import { progressionPrescription } from './workouts.history';
import type { SetEntry, TemplateExercise, WorkoutSession } from './workouts.schemas';
import type { ActiveSessionContent, SessionDetailInput, SessionUiState } from './workouts.session-view';

/** Shared builders for the view-model tests. */
export const utc = () => 0;
export const t0 = Date.UTC(2026, 10, 9, 10);
export const squat: TemplateExercise = { id: 'sq', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 };
export const pushUp: TemplateExercise = { id: 'pu', exerciseId: 'push-up', workingSets: 2, repRange: { min: 8, max: 15 }, incrementKg: 0 };
export const idle: SessionUiState = { expandedExerciseId: null, drafts: {}, pending: {}, rest: null };

export const session = (extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's-now', templateId: 'full-body', startedAt: t0, endedAt: null, completed: false, deload: false,
  prescription: { templateName: 'Full Body', exercises: [squat, pushUp] }, ...extra,
});
export const entry = (id: string, exercise: TemplateExercise, index: number, loadKg: number | null, reps: number, type: SetEntry['type'] = 'working'): SetEntry => ({
  id, sessionId: 's-now', templateExerciseId: exercise.id, exerciseId: exercise.exerciseId, index, type, loadKg, reps, committedAt: t0 + index, editedAt: null,
});
export const history = (sets: [number | null, number][]): ProgressionSession => ({ id: 'old', sets: sets.map(([loadKg, reps]) => ({ type: 'working', loadKg, reps })) });
export function detail(options: { squatHistory?: ProgressionSession[]; sets?: SetEntry[]; ended?: boolean } = {}): SessionDetailInput {
  const sets = options.sets ?? [];
  return {
    session: session(options.ended ? { endedAt: t0 + 3_600_000, completed: true } : {}),
    exercises: [squat, pushUp].map((templateExercise) => ({
      templateExercise,
      exercise: templateExercise.exerciseId === 'back-squat'
        ? { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false }
        : { id: 'push-up', name: 'Push-up', muscleGroup: 'chest', equipment: 'none', bodyweight: true },
      bodyweight: templateExercise.id === 'pu',
      progression: computeProgression(progressionPrescription(templateExercise), templateExercise.id === 'sq' ? options.squatHistory ?? [] : []),
      sets: sets.filter((set) => set.templateExerciseId === templateExercise.id),
    })),
  };
}
export const card = (content: ActiveSessionContent, id: string) => content.exercises.find((item) => item.templateExerciseId === id)!;
