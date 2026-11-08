import { z } from 'zod';

import { activityLevelOptions, goalRatePresets, nutritionInputBounds } from './nutrition.types';
import type { GoalSelection, NutritionProfile, StartingPlanInput } from './nutrition.types';

export const nutritionProfileSchema = z.object({
  sex: z.enum(['female', 'male']),
  age: z.number().int().min(nutritionInputBounds.age.min).max(nutritionInputBounds.age.max),
  heightCm: z.number().min(nutritionInputBounds.heightCm.min).max(nutritionInputBounds.heightCm.max),
  activityLevel: z.literal(activityLevelOptions.map((option) => option.value)),
}) satisfies z.ZodType<NutritionProfile>;

export const goalSelectionSchema = z.discriminatedUnion('goal', [
  z.object({ goal: z.literal('fatLoss'), ratePreset: z.literal(goalRatePresets.fatLoss) }),
  z.object({ goal: z.literal('maintenance'), ratePreset: z.null() }),
  z.object({ goal: z.literal('muscleGain'), ratePreset: z.literal(goalRatePresets.muscleGain) }),
]) satisfies z.ZodType<GoalSelection>;

/** Canonical units only; text-to-number conversion belongs at the form boundary. */
export const startingPlanInputSchema = z.intersection(
  nutritionProfileSchema.extend({
    weightKg: z.number().min(nutritionInputBounds.weightKg.min).max(nutritionInputBounds.weightKg.max),
  }),
  goalSelectionSchema,
) satisfies z.ZodType<StartingPlanInput>;
