import type { ActivityLevel, GoalSelection, Sex } from '@/lib/contracts/nutrition-inputs';

export { activityLevelOptions, defaultRatePresets, goalOptions, goalRatePresets, nutritionInputBounds } from '@/lib/contracts/nutrition-inputs';
export type { ActivityLevel, Goal, GoalSelection, Sex } from '@/lib/contracts/nutrition-inputs';
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
