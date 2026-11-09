import type { ExerciseLibraryEntry, SessionTemplate, TemplateExercise, TrainingProgram } from './workouts.schemas';

/** What the Training Program editor (S6) edits and saves as one *Your edit* Plan Version (D5). */
export interface ProgramDraft {
  weeklySessionTarget: number;
  trainingProgram: TrainingProgram;
}

/** TRN-5 defaults, editable per exercise: barbell 2.5 kg, dumbbell 2 kg, machine or cable 5 kg; bodyweight has none. */
export function defaultIncrementKg(exercise: ExerciseLibraryEntry): number {
  if (exercise.bodyweight) return 0;
  return ({ barbell: 2.5, dumbbell: 2, machine: 5, cable: 5, none: 0 } as const)[exercise.equipment];
}

export function newTemplateExercise(templateId: string, exercise: ExerciseLibraryEntry, newId: () => string): TemplateExercise {
  return {
    id: `${templateId}-${exercise.id}-${newId()}`, exerciseId: exercise.id, workingSets: 3, repRange: { min: 8, max: 12 },
    incrementKg: defaultIncrementKg(exercise),
  };
}

export function blankTemplate(name: string, newId: () => string): SessionTemplate {
  return { id: `template-${newId()}`, name, exercises: [] };
}

export interface ProgramDraftValidation {
  valid: boolean;
  /** Keyed by path, e.g. `templates.0.exercises.1.repRange`. */
  errors: Record<string, string>;
}

export function validateProgramDraft(draft: ProgramDraft): ProgramDraftValidation {
  const errors: Record<string, string> = {};
  const { weeklySessionTarget, trainingProgram } = draft;
  if (!Number.isInteger(weeklySessionTarget) || weeklySessionTarget < 1 || weeklySessionTarget > 6) errors.weeklySessionTarget = 'Choose 1 to 6 sessions';
  if (trainingProgram.rotation.length === 0) errors.rotation = 'Add at least one Session Template';
  trainingProgram.rotation.forEach((template, ti) => {
    if (!template.name.trim()) errors[`templates.${ti}.name`] = 'Name this template';
    if (template.exercises.length === 0) errors[`templates.${ti}.exercises`] = 'Add at least one exercise';
    template.exercises.forEach((exercise, ei) => {
      const path = `templates.${ti}.exercises.${ei}`;
      if (!Number.isInteger(exercise.workingSets) || exercise.workingSets < 1) errors[`${path}.workingSets`] = 'Use at least 1 set';
      const { min, max } = exercise.repRange;
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1) errors[`${path}.repRange`] = 'Use whole reps, at least 1';
      else if (max < min) errors[`${path}.repRange`] = 'The top of the range must be at least the bottom';
      if (!(exercise.incrementKg >= 0)) errors[`${path}.incrementKg`] = 'Increment cannot be negative';
      if (exercise.restOverrideSeconds !== undefined && (!Number.isInteger(exercise.restOverrideSeconds) || exercise.restOverrideSeconds < 1)) {
        errors[`${path}.restOverrideSeconds`] = 'Use a whole number of seconds';
      }
    });
  });
  return { valid: Object.keys(errors).length === 0, errors };
}
