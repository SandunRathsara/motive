import {
  exerciseLibrary, exerciseLibraryEntrySchema, exerciseLibraryVersion, getExerciseById,
  sessionTemplateSchema, starterSessionTemplate, starterTrainingProgram, templateExerciseSchema, trainingProgramSchema,
} from './index';

const templateExercise = {
  id: 'full-body-back-squat', exerciseId: 'back-squat', workingSets: 3,
  repRange: { min: 6, max: 10 }, incrementKg: 2.5,
};

const sessionTemplate = {
  id: 'full-body', name: 'Full Body', exercises: [
    templateExercise,
    { ...templateExercise, id: 'full-body-bench-press', exerciseId: 'bench-press' },
  ],
};

test('ships a versioned, valid library of 30 exercises across ten muscle groups', () => {
  expect(exerciseLibraryVersion).toBe(1);
  expect(exerciseLibrary).toHaveLength(30);
  expect(new Set(exerciseLibrary.map((exercise) => exercise.id)).size).toBe(exerciseLibrary.length);
  expect(new Set(exerciseLibrary.map((exercise) => exercise.muscleGroup)).size).toBe(10);
  for (const exercise of exerciseLibrary) {
    expect(exerciseLibraryEntrySchema.safeParse(exercise).success).toBe(true);
  }
});

test('resolves a stable library ID and leaves an unknown ID absent', () => {
  expect(getExerciseById('back-squat')).toEqual({
    id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false,
  });
  expect(getExerciseById('not-in-the-library')).toBeUndefined();
});

test('library entries require identity, supported equipment, a muscle group and a bodyweight flag', () => {
  const exercise = getExerciseById('back-squat');
  for (const change of [
    { id: '' }, { name: '' }, { muscleGroup: 'unknown' }, { equipment: 'kettlebell' },
    { bodyweight: undefined }, { bodyweight: 'false' }, { loadKg: 80 },
  ]) {
    expect(exerciseLibraryEntrySchema.safeParse({ ...exercise, ...change }).success).toBe(false);
  }
});

test('validates a Template Exercise prescription and optional rest override in canonical units', () => {
  expect(templateExerciseSchema.parse(templateExercise)).toEqual(templateExercise);
  expect(templateExerciseSchema.parse({ ...templateExercise, restOverrideSeconds: 120 }).restOverrideSeconds).toBe(120);
  expect(templateExerciseSchema.safeParse({ ...templateExercise, exerciseId: 'push-up', incrementKg: 0 }).success).toBe(true);
  for (const change of [
    { id: '' }, { exerciseId: '' }, { workingSets: 0 }, { workingSets: 1.5 },
    { repRange: { min: 0, max: 10 } }, { repRange: { min: 6, max: 5 } },
    { repRange: { min: 6, max: 10.5 } }, { incrementKg: -1 }, { incrementKg: Infinity },
    { restOverrideSeconds: 0 }, { restOverrideSeconds: 1.5 }, { loadKg: 80 },
  ]) {
    expect(templateExerciseSchema.safeParse({ ...templateExercise, ...change }).success).toBe(false);
  }
});

test('a Session Template preserves exercise order and requires distinct stable exercise IDs', () => {
  expect(sessionTemplateSchema.parse(sessionTemplate)).toEqual(sessionTemplate);
  for (const change of [
    { id: '' }, { name: '' }, { exercises: [] },
    { exercises: [templateExercise, templateExercise] },
    { exercises: [{ ...templateExercise, workingSets: -1 }] },
  ]) {
    expect(sessionTemplateSchema.safeParse({ ...sessionTemplate, ...change }).success).toBe(false);
  }
});

test('a Training Program preserves rotation order and rejects missing or duplicate Session Templates', () => {
  const program = { rotation: [{ ...sessionTemplate, id: 'upper', name: 'Upper' }, sessionTemplate] };
  expect(trainingProgramSchema.parse(program)).toEqual(program);
  for (const rotation of [[], [sessionTemplate, sessionTemplate], [{ ...sessionTemplate, name: '' }]]) {
    expect(trainingProgramSchema.safeParse({ rotation }).success).toBe(false);
  }
});

test('the starter is the specified Full Body Session Template in a valid single-template rotation', () => {
  expect(sessionTemplateSchema.safeParse(starterSessionTemplate).success).toBe(true);
  expect(trainingProgramSchema.safeParse(starterTrainingProgram).success).toBe(true);
  expect(starterTrainingProgram).toEqual({ rotation: [{
    id: 'full-body', name: 'Full Body', exercises: [
      { id: 'full-body-back-squat', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
      { id: 'full-body-bench-press', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
      { id: 'full-body-lat-pulldown', exerciseId: 'lat-pulldown', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 5 },
      { id: 'full-body-romanian-deadlift', exerciseId: 'romanian-deadlift', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 2.5 },
      { id: 'full-body-dumbbell-shoulder-press', exerciseId: 'dumbbell-shoulder-press', workingSets: 2, repRange: { min: 8, max: 12 }, incrementKg: 2 },
    ],
  }] });
  expect(starterTrainingProgram.rotation[0]).toEqual(starterSessionTemplate);
});

test('starter template and Template Exercise IDs are unique, with only resolvable library references', () => {
  const templateIds = starterTrainingProgram.rotation.map((template) => template.id);
  const exercises = starterTrainingProgram.rotation.flatMap((template) => template.exercises);
  expect(new Set(templateIds).size).toBe(templateIds.length);
  expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length);
  for (const exercise of exercises) {
    expect(getExerciseById(exercise.exerciseId)).toEqual(expect.objectContaining({ id: exercise.exerciseId }));
  }
});

test('starter increments match the TRN-5 equipment defaults in kg', () => {
  const defaultIncrements: Record<string, number> = { barbell: 2.5, dumbbell: 2, machine: 5, cable: 5, none: 0 };
  for (const template of starterTrainingProgram.rotation) {
    for (const exercise of template.exercises) {
      const equipment = getExerciseById(exercise.exerciseId)?.equipment;
      expect(exercise.incrementKg).toBe(defaultIncrements[equipment ?? 'missing']);
    }
  }
});
