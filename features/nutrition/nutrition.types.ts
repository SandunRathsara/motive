/** NUT-1: percentages of body weight per week. Maintenance has no rate choice. */
export const goalRatePresets = {
  fatLoss: [-0.25, -0.5, -0.75],
  maintenance: [],
  muscleGain: [0.1, 0.25, 0.4],
} as const;
export const defaultRatePresets = { fatLoss: -0.5, maintenance: null, muscleGain: 0.25 } as const;

export type Sex = 'female' | 'male';
export type ActivityLevel = typeof activityLevelOptions[number]['value'];
export type GoalSelection =
  | { goal: 'fatLoss'; ratePreset: typeof goalRatePresets.fatLoss[number] }
  | { goal: 'maintenance'; ratePreset: null }
  | { goal: 'muscleGain'; ratePreset: typeof goalRatePresets.muscleGain[number] };
export type Goal = GoalSelection['goal'];
export type NutritionProfile = { sex: Sex; age: number; heightCm: number; activityLevel: ActivityLevel };
export type StartingPlanInput = NutritionProfile & { weightKg: number } & GoalSelection;
export type CalorieFloor = { kcal: number; reason: 'bmr' | 'sexMinimum'; bmrKcal: number; sexMinimumKcal: number };
export type StartingPlan = {
  bmrKcal: number;
  expenditureEstimateKcal: number;
  offsetKcal: number;
  floor: CalorieFloor;
  kcalTarget: number;
  clamped: boolean;
  suggestedSlowerPreset: GoalSelection['ratePreset'];
  proteinFloorG: number;
  fatMinimumG: number;
};
export const nutritionInputBounds = {
  age: { min: 18, max: 90 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 250 },
} as const;
export const activityLevelOptions = [
  { value: 1.3, label: 'Mostly sitting' },
  { value: 1.5, label: 'On my feet part of the day' },
  { value: 1.7, label: 'Physically demanding day' },
] as const;
export const goalOptions = [
  { value: 'fatLoss', label: 'Fat Loss' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'muscleGain', label: 'Muscle Gain' },
] as const;
