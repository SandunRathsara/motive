import { defaultRestSeconds } from './workouts.history';
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

/**
 * What the editor needs to change a draft. The feature owns id generation and the editing rules so
 * components never reach for randomness or business rules; ids only have to be unique inside the
 * program (Hermes has no Web Crypto assumption).
 */
export interface ProgramDraftTools {
  newTemplate(name: string): SessionTemplate;
  newExercise(templateId: string, exercise: ExerciseLibraryEntry): TemplateExercise;
  /** Swaps the item at `index` with its neighbour; out-of-range moves leave the order unchanged. */
  move<T>(items: readonly T[], index: number, direction: -1 | 1): T[];
  /** Rest between sets: the default is stored as "no override" so a later default change still applies. */
  withRest(exercise: TemplateExercise, seconds: number | undefined): TemplateExercise;
  validate(draft: ProgramDraft): ProgramDraftValidation;
}

const randomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function move<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  const next = [...items];
  if (target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function withRest(exercise: TemplateExercise, seconds: number | undefined): TemplateExercise {
  const { restOverrideSeconds: _previous, ...rest } = exercise;
  return seconds === undefined || seconds === defaultRestSeconds ? rest : { ...rest, restOverrideSeconds: seconds };
}

export const programDraftTools: ProgramDraftTools = {
  newTemplate: (name) => blankTemplate(name, randomId),
  newExercise: (templateId, exercise) => newTemplateExercise(templateId, exercise, randomId),
  move,
  withRest,
  validate: validateProgramDraft,
};

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
