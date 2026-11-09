import { blankTemplate, createProgramDraftTools, defaultIncrementKg, newTemplateExercise, validateProgramDraft, type ProgramDraft } from './workouts.program';
import { trainingProgramSchema } from './workouts.schemas';
import { starterTrainingProgram } from './workouts.content';

const ids = () => { let n = 0; return () => `n${++n}`; };
const draft = (overrides: Partial<ProgramDraft> = {}): ProgramDraft => ({ weeklySessionTarget: 3, trainingProgram: starterTrainingProgram, ...overrides });

test('default increments follow TRN-5: barbell 2.5, dumbbell 2, machine or cable 5, bodyweight none', () => {
  const entry = (equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'none', bodyweight = false) => ({ id: 'x', name: 'X', muscleGroup: 'chest' as const, equipment, bodyweight });
  expect([defaultIncrementKg(entry('barbell')), defaultIncrementKg(entry('dumbbell')), defaultIncrementKg(entry('machine')), defaultIncrementKg(entry('cable'))]).toEqual([2.5, 2, 5, 5]);
  expect(defaultIncrementKg(entry('none', true))).toBe(0);
});

test('a new Template Exercise gets a fresh id, the library default increment and a sensible prescription', () => {
  const made = newTemplateExercise('full-body', { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quadriceps', equipment: 'machine', bodyweight: false }, ids());
  expect(made).toEqual({ id: 'full-body-leg-press-n1', exerciseId: 'leg-press', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 5 });
});

test('a blank template needs a name and an exercise before it saves', () => {
  const blank = blankTemplate('Pull', ids());
  expect(blank).toEqual({ id: 'template-n1', name: 'Pull', exercises: [] });
  const result = validateProgramDraft(draft({ trainingProgram: { rotation: [...starterTrainingProgram.rotation, blank] } }));
  expect(result.valid).toBe(false);
  expect(result.errors['templates.1.exercises']).toBe('Add at least one exercise');
});

test('the starter program is valid', () => {
  expect(validateProgramDraft(draft())).toEqual({ valid: true, errors: {} });
});

test('flags an empty rotation, a blank name, a bad rep range, no sets and a target outside 1–6', () => {
  const bad: ProgramDraft = { weeklySessionTarget: 7, trainingProgram: { rotation: [{ id: 't', name: ' ', exercises: [
    { id: 'e', exerciseId: 'back-squat', workingSets: 0, repRange: { min: 10, max: 6 }, incrementKg: -1 },
  ] }] } };
  expect(validateProgramDraft(bad).errors).toEqual({
    weeklySessionTarget: 'Choose 1 to 6 sessions',
    'templates.0.name': 'Name this template',
    'templates.0.exercises.0.workingSets': 'Use at least 1 set',
    'templates.0.exercises.0.repRange': 'The top of the range must be at least the bottom',
    'templates.0.exercises.0.incrementKg': 'Increment cannot be negative',
  });
  expect(validateProgramDraft({ weeklySessionTarget: 3, trainingProgram: { rotation: [] } }).errors.rotation).toBe('Add at least one Session Template');
});

test('a rest override must be a positive whole number of seconds', () => {
  const withRest = (restOverrideSeconds: number): ProgramDraft => ({ weeklySessionTarget: 3, trainingProgram: { rotation: [{ id: 't', name: 'T', exercises: [
    { id: 'e', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5, restOverrideSeconds },
  ] }] } });
  expect(validateProgramDraft(withRest(120)).valid).toBe(true);
  expect(validateProgramDraft(withRest(0)).errors['templates.0.exercises.0.restOverrideSeconds']).toBe('Use a whole number of seconds');
});

test('draft tools make templates and exercises with ids that do not collide', () => {
  const tools = createProgramDraftTools();
  const entry = { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quadriceps' as const, equipment: 'machine' as const, bodyweight: false };
  const first = tools.newTemplate('Legs');
  const second = tools.newTemplate('Legs');
  expect(first).toMatchObject({ name: 'Legs', exercises: [] });
  expect(first.id).not.toBe(second.id);
  const exercise = tools.newExercise(first.id, entry);
  expect(exercise).toMatchObject({ exerciseId: 'leg-press', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 5 });
  expect(exercise.id.startsWith(`${first.id}-leg-press-`)).toBe(true);
  expect(tools.newExercise(first.id, entry).id).not.toBe(exercise.id);
});

test('a program built with the draft tools passes validation and the stored schema', () => {
  const tools = createProgramDraftTools();
  const entry = { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quadriceps' as const, equipment: 'machine' as const, bodyweight: false };
  const template = tools.newTemplate('Legs');
  const program = { rotation: [{ ...template, exercises: [tools.newExercise(template.id, entry)] }] };
  expect(validateProgramDraft({ weeklySessionTarget: 3, trainingProgram: program }).valid).toBe(true);
  expect(trainingProgramSchema.safeParse(program).success).toBe(true);
});
