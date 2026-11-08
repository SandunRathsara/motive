import { goalRatePresets } from './nutrition.types';
import type { CalorieFloor, GoalSelection, NutritionProfile, StartingPlan, StartingPlanInput } from './nutrition.types';

/** Caller supplies latest known Trend Weight, or Profile weight when none is known. No Health I/O. */
export function calculateCalorieFloor(profile: Pick<NutritionProfile, 'sex' | 'age' | 'heightCm'>, referenceWeightKg: number): CalorieFloor {
  const bmrKcal = 10 * referenceWeightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === 'male' ? 5 : -161);
  const sexMinimumKcal = profile.sex === 'male' ? 1500 : 1200;
  return { kcal: Math.max(bmrKcal, sexMinimumKcal), reason: bmrKcal >= sexMinimumKcal ? 'bmr' : 'sexMinimum', bmrKcal, sexMinimumKcal };
}

/** NUT-1 rates are percentages of body weight per week, not fractional rates. */
export function calculateDailyEnergyOffset(referenceWeightKg: number, selection: GoalSelection): number {
  return selection.ratePreset === null ? 0 : selection.ratePreset / 100 * referenceWeightKg * 7700 / 7;
}

/** Round first, then clamp to a whole kcal at/above the exact NUT-8 floor. */
export function clampCalorieTarget(requestedKcal: number, floor: CalorieFloor, selection: GoalSelection) {
  const roundedKcal = Math.round(requestedKcal / 50) * 50;
  const clamped = roundedKcal < floor.kcal;
  return {
    kcalTarget: Math.max(roundedKcal, Math.ceil(floor.kcal)),
    clamped,
    suggestedSlowerPreset: clamped && selection.goal === 'fatLoss'
      ? [...goalRatePresets.fatLoss].reverse().find((rate) => rate > selection.ratePreset) ?? null
      : null,
  };
}

export function calculateStartingPlan(input: StartingPlanInput): StartingPlan {
  const floor = calculateCalorieFloor(input, input.weightKg);
  const { bmrKcal } = floor;
  const expenditureEstimateKcal = bmrKcal * input.activityLevel;
  const offsetKcal = calculateDailyEnergyOffset(input.weightKg, input);
  return {
    bmrKcal,
    expenditureEstimateKcal,
    offsetKcal,
    floor,
    ...clampCalorieTarget(expenditureEstimateKcal + offsetKcal, floor, input),
    proteinFloorG: Math.round(input.weightKg * (input.goal === 'fatLoss' ? 1.8 : 1.6)),
    fatMinimumG: input.weightKg * 0.6,
  };
}
