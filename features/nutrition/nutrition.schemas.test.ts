import {
  activityLevelOptions, defaultRatePresets, goalOptions, goalRatePresets,
  goalSelectionSchema, nutritionInputBounds, startingPlanInputSchema,
} from './index';

const input = {
  sex: 'female', age: 30, heightCm: 165, activityLevel: 1.5,
  weightKg: 62.3, goal: 'fatLoss', ratePreset: -0.5,
};

test('onboarding input bounds are inclusive and reject out-of-bounds or non-finite values', () => {
  for (const change of [
    { age: 18, heightCm: 120, weightKg: 35 },
    { age: 90, heightCm: 230, weightKg: 250 },
  ]) {
    expect(startingPlanInputSchema.safeParse({ ...input, ...change }).success).toBe(true);
  }
  for (const change of [
    { age: 17 }, { age: 91 }, { age: 30.5 },
    { heightCm: 119.9 }, { heightCm: 230.1 },
    { weightKg: 34.9 }, { weightKg: 250.1 },
    { age: NaN }, { heightCm: Infinity }, { weightKg: -Infinity },
  ]) {
    expect(startingPlanInputSchema.safeParse({ ...input, ...change }).success).toBe(false);
  }
});

test.each([
  { goal: 'fatLoss', ratePreset: -0.25 },
  { goal: 'fatLoss', ratePreset: -0.5 },
  { goal: 'fatLoss', ratePreset: -0.75 },
  { goal: 'maintenance', ratePreset: null },
  { goal: 'muscleGain', ratePreset: 0.1 },
  { goal: 'muscleGain', ratePreset: 0.25 },
  { goal: 'muscleGain', ratePreset: 0.4 },
])('accepts the listed $goal / $ratePreset choice', (selection) => {
  expect(goalSelectionSchema.parse(selection)).toEqual(selection);
  expect(startingPlanInputSchema.parse({ ...input, ...selection })).toEqual({ ...input, ...selection });
});

test('a Goal accepts only its own listed presets and Maintenance has no rate', () => {
  for (const selection of [
    { goal: 'fatLoss', ratePreset: null },
    { goal: 'fatLoss', ratePreset: 0.25 },
    { goal: 'fatLoss', ratePreset: -1 },
    { goal: 'muscleGain', ratePreset: -0.25 },
    { goal: 'muscleGain', ratePreset: 0.5 },
    { goal: 'maintenance', ratePreset: 0 },
    { goal: 'maintenance', ratePreset: -0.25 },
    { goal: 'maintenance' },
    { goal: 'unknown', ratePreset: null },
  ]) {
    expect(goalSelectionSchema.safeParse(selection).success).toBe(false);
    expect(startingPlanInputSchema.safeParse({ ...input, ...selection }).success).toBe(false);
  }
});

test('canonical numeric inputs accept only the three activity factors and the formula sexes', () => {
  for (const activityLevel of [1.3, 1.5, 1.7]) {
    expect(startingPlanInputSchema.safeParse({ ...input, activityLevel }).success).toBe(true);
  }
  for (const change of [
    { activityLevel: 1.2 }, { activityLevel: 0 }, { activityLevel: '1.5' },
    { sex: 'unknown' }, { weightKg: '62.3' }, { heightCm: '165' },
  ]) {
    expect(startingPlanInputSchema.safeParse({ ...input, ...change }).success).toBe(false);
  }
});

test('onboarding publishes the owner-approved labels, bounds, and NUT-1 defaults', () => {
  expect(activityLevelOptions).toEqual([
    { value: 1.3, label: 'Mostly sitting' },
    { value: 1.5, label: 'On my feet part of the day' },
    { value: 1.7, label: 'Physically demanding day' },
  ]);
  expect(nutritionInputBounds).toEqual({ age: { min: 18, max: 90 }, heightCm: { min: 120, max: 230 }, weightKg: { min: 35, max: 250 } });
  expect(goalOptions).toEqual([
    { value: 'fatLoss', label: 'Fat Loss' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'muscleGain', label: 'Muscle Gain' },
  ]);
  expect(goalRatePresets).toEqual({ fatLoss: [-0.25, -0.5, -0.75], maintenance: [], muscleGain: [0.1, 0.25, 0.4] });
  expect(defaultRatePresets).toEqual({ fatLoss: -0.5, maintenance: null, muscleGain: 0.25 });
});
