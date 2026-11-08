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

export function calculateStartingPlan(input: StartingPlanInput): StartingPlan {
  const floor = calculateCalorieFloor(input, input.weightKg);
  const { bmrKcal } = floor;
  const expenditureEstimateKcal = bmrKcal * input.activityLevel;
  const offsetKcal = calculateDailyEnergyOffset(input.weightKg, input);
  const requestedKcal = expenditureEstimateKcal + offsetKcal;
  const roundedKcal = Math.round(requestedKcal / 50) * 50;
  const clamped = roundedKcal < floor.kcal;
  return {
    bmrKcal,
    expenditureEstimateKcal,
    offsetKcal,
    floor,
    // ONB-2 rounds first; NUT-8 then applies the exact floor, even between 50-kcal steps.
    kcalTarget: Math.max(roundedKcal, floor.kcal),
    clamped,
    suggestedSlowerPreset: clamped && input.goal === 'fatLoss'
      ? [...goalRatePresets.fatLoss].reverse().find((rate) => rate > input.ratePreset) ?? null
      : null,
    proteinFloorG: Math.round(input.weightKg * (input.goal === 'fatLoss' ? 1.8 : 1.6)),
    fatMinimumG: input.weightKg * 0.6,
  };
}
