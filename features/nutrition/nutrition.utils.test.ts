import { calculateCalorieFloor, calculateDailyEnergyOffset, calculateStartingPlan } from './index';
import type { ActivityLevel, GoalSelection, Sex } from './index';

test('starts Maintenance from the male Mifflin-St Jeor estimate without an energy offset', () => {
  // BMR: 800 + 1125 - 175 + 5 = 1755; activity: 1755 × 1.5 = 2632.5.
  expect(calculateStartingPlan({
    sex: 'male', age: 35, heightCm: 180, activityLevel: 1.5,
    weightKg: 80, goal: 'maintenance', ratePreset: null,
  })).toEqual({
    bmrKcal: 1755,
    expenditureEstimateKcal: 2632.5,
    offsetKcal: 0,
    floor: { kcal: 1755, reason: 'bmr', bmrKcal: 1755, sexMinimumKcal: 1500 },
    kcalTarget: 2650,
    clamped: false,
    suggestedSlowerPreset: null,
    proteinFloorG: 128,
    fatMinimumG: 48,
  });
});

test('Fat Loss applies the percentage-per-week deficit and its higher protein floor', () => {
  // −0.5% of 80 kg = −0.4 kg/week = −3080 kcal/week = −440 kcal/day.
  expect(calculateStartingPlan({
    sex: 'male', age: 35, heightCm: 180, activityLevel: 1.5,
    weightKg: 80, goal: 'fatLoss', ratePreset: -0.5,
  })).toMatchObject({ offsetKcal: -440, kcalTarget: 2200, proteinFloorG: 144, fatMinimumG: 48 });
});

test('a BMR-limited start applies the exact floor after rounding and suggests the next slower listed preset', () => {
  // 2281.5 − 660 = 1621.5 is below BMR 1755; 1750 would still be below it.
  expect(calculateStartingPlan({
    sex: 'male', age: 35, heightCm: 180, activityLevel: 1.3,
    weightKg: 80, goal: 'fatLoss', ratePreset: -0.75,
  })).toMatchObject({
    floor: { kcal: 1755, reason: 'bmr' }, kcalTarget: 1755,
    clamped: true, suggestedSlowerPreset: -0.5,
  });
});

test.each([
  { sex: 'male' as const, weightKg: 118, floorKcal: 2135, kcalTarget: 2150, clamped: false, suggestedSlowerPreset: null },
  { sex: 'female' as const, weightKg: 92, floorKcal: 1709, kcalTarget: 1709, clamped: true, suggestedSlowerPreset: -0.25 },
])('the $sex floor check follows target rounding, not the unrounded request', (fixture) => {
  // Male: request 2126.5 → 2150, above floor 2135. Female: 1715.7 → 1700, below floor 1709.
  const result = calculateStartingPlan({
    sex: fixture.sex, age: 35, heightCm: 180, activityLevel: 1.3,
    weightKg: fixture.weightKg, goal: 'fatLoss', ratePreset: -0.5,
  });
  expect(result).toMatchObject({
    floor: { kcal: fixture.floorKcal }, kcalTarget: fixture.kcalTarget,
    clamped: fixture.clamped, suggestedSlowerPreset: fixture.suggestedSlowerPreset,
  });
});

// Hand-worked 80 kg, 180 cm, age 35 cases. Columns follow the seven selections below.
const selections: (GoalSelection & { offsetKcal: number; proteinFloorG: number })[] = [
  { goal: 'fatLoss', ratePreset: -0.25, offsetKcal: -220, proteinFloorG: 144 },
  { goal: 'fatLoss', ratePreset: -0.5, offsetKcal: -440, proteinFloorG: 144 },
  { goal: 'fatLoss', ratePreset: -0.75, offsetKcal: -660, proteinFloorG: 144 },
  { goal: 'maintenance', ratePreset: null, offsetKcal: 0, proteinFloorG: 128 },
  { goal: 'muscleGain', ratePreset: 0.1, offsetKcal: 88, proteinFloorG: 128 },
  { goal: 'muscleGain', ratePreset: 0.25, offsetKcal: 220, proteinFloorG: 128 },
  { goal: 'muscleGain', ratePreset: 0.4, offsetKcal: 352, proteinFloorG: 128 },
];
const fixtures: { sex: Sex; activityLevel: ActivityLevel; bmrKcal: number; expenditureEstimateKcal: number; targets: number[] }[] = [
  { sex: 'male', activityLevel: 1.3, bmrKcal: 1755, expenditureEstimateKcal: 2281.5, targets: [2050, 1850, 1755, 2300, 2350, 2500, 2650] },
  { sex: 'male', activityLevel: 1.5, bmrKcal: 1755, expenditureEstimateKcal: 2632.5, targets: [2400, 2200, 1950, 2650, 2700, 2850, 3000] },
  { sex: 'male', activityLevel: 1.7, bmrKcal: 1755, expenditureEstimateKcal: 2983.5, targets: [2750, 2550, 2300, 3000, 3050, 3200, 3350] },
  { sex: 'female', activityLevel: 1.3, bmrKcal: 1589, expenditureEstimateKcal: 2065.7, targets: [1850, 1650, 1589, 2050, 2150, 2300, 2400] },
  { sex: 'female', activityLevel: 1.5, bmrKcal: 1589, expenditureEstimateKcal: 2383.5, targets: [2150, 1950, 1700, 2400, 2450, 2600, 2750] },
  { sex: 'female', activityLevel: 1.7, bmrKcal: 1589, expenditureEstimateKcal: 2701.3, targets: [2500, 2250, 2050, 2700, 2800, 2900, 3050] },
];

describe.each(fixtures)('$sex, activity $activityLevel', (fixture) => {
  test.each(selections.map((selection, index) => ({ ...selection, kcalTarget: fixture.targets[index] })))('$goal / $ratePreset', (selection) => {
    const result = calculateStartingPlan({
      sex: fixture.sex, age: 35, heightCm: 180, activityLevel: fixture.activityLevel,
      weightKg: 80, ...selection,
    });
    expect(result.bmrKcal).toBe(fixture.bmrKcal);
    expect(result.expenditureEstimateKcal).toBeCloseTo(fixture.expenditureEstimateKcal, 8);
    expect(result.offsetKcal).toBeCloseTo(selection.offsetKcal, 8);
    expect(result.kcalTarget).toBe(selection.kcalTarget);
    expect(result.proteinFloorG).toBe(selection.proteinFloorG);
    expect(result.fatMinimumG).toBe(48);
  });
});

test.each(selections)('the reusable offset uses the supplied reference weight for $goal / $ratePreset', (selection) => {
  expect(calculateDailyEnergyOffset(80, selection)).toBeCloseTo(selection.offsetKcal, 8);
});

test('the floor uses the reference weight supplied by Settings or a review, not an onboarding weight', () => {
  const profile = { sex: 'male', age: 35, heightCm: 180 } as const;
  expect(calculateCalorieFloor(profile, 80)).toEqual({ kcal: 1755, reason: 'bmr', bmrKcal: 1755, sexMinimumKcal: 1500 });
  expect(calculateCalorieFloor(profile, 60)).toEqual({ kcal: 1555, reason: 'bmr', bmrKcal: 1555, sexMinimumKcal: 1500 });
  expect(calculateDailyEnergyOffset(60, { goal: 'fatLoss', ratePreset: -0.5 })).toBe(-330);
});

test.each([
  { sex: 'female' as const, bmrKcal: 489, kcal: 1200 },
  { sex: 'male' as const, bmrKcal: 655, kcal: 1500 },
])('$sex has a sex-minimum reason when BMR is lower', ({ sex, bmrKcal, kcal }) => {
  expect(calculateCalorieFloor({ sex, age: 90, heightCm: 120 }, 35))
    .toEqual({ kcal, reason: 'sexMinimum', bmrKcal, sexMinimumKcal: kcal });
});

test('a sex-minimum-limited start clamps to 1500 kcal', () => {
  const result = calculateStartingPlan({
    sex: 'male', age: 30, heightCm: 165, activityLevel: 1.3,
    weightKg: 60, goal: 'fatLoss', ratePreset: -0.75,
  });
  expect(result).toMatchObject({
    bmrKcal: 1486.25,
    floor: { kcal: 1500, reason: 'sexMinimum' }, kcalTarget: 1500,
    clamped: true, suggestedSlowerPreset: -0.5, proteinFloorG: 108, fatMinimumG: 36,
  });
  expect(result.offsetKcal).toBeCloseTo(-495, 8);
});

test('the slowest listed Fat Loss preset never fabricates a slower number when it is clamped', () => {
  expect(calculateStartingPlan({
    sex: 'female', age: 90, heightCm: 120, activityLevel: 1.3,
    weightKg: 35, goal: 'fatLoss', ratePreset: -0.25,
  })).toMatchObject({ kcalTarget: 1200, clamped: true, suggestedSlowerPreset: null });
});

test('Maintenance can clamp to the floor without offering a rate choice', () => {
  expect(calculateStartingPlan({
    sex: 'female', age: 70, heightCm: 150, activityLevel: 1.3,
    weightKg: 35, goal: 'maintenance', ratePreset: null,
  })).toMatchObject({ bmrKcal: 776.5, kcalTarget: 1200, clamped: true, suggestedSlowerPreset: null });
});

test('protein rounds to a gram while fat retains the exact 0.6 g/kg minimum', () => {
  const result = calculateStartingPlan({
    sex: 'female', age: 30, heightCm: 165, activityLevel: 1.5,
    weightKg: 62.3, goal: 'muscleGain', ratePreset: 0.25,
  });
  expect(result.proteinFloorG).toBe(100);
  expect(result.fatMinimumG).toBeCloseTo(37.38, 8);
});
