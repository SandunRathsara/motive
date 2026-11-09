import type { ProgramDraftTools } from '@/features/workouts';

/** Stand-in for the feature's draft tools: deterministic ids, a plain swap, and rest 90 s as the default. */
export const programTools: ProgramDraftTools = {
  newTemplate: (name) => ({ id: 'template-new', name, exercises: [] }),
  newExercise: (templateId, exercise) => ({
    id: `${templateId}-${exercise.id}-new`, exerciseId: exercise.id, workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 2.5,
  }),
  move: (items, index, direction) => {
    const next = [...items];
    const target = index + direction;
    if (target >= 0 && target < items.length) [next[index], next[target]] = [next[target], next[index]];
    return next;
  },
  withRest: (exercise, seconds) => {
    const { restOverrideSeconds: _previous, ...rest } = exercise;
    return seconds === undefined || seconds === 90 ? rest : { ...rest, restOverrideSeconds: seconds };
  },
  validate: () => ({ valid: true, errors: {} }),
};
