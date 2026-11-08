import { z } from 'zod';
import { goalSelectionSchema, nutritionProfileSchema, nutritionInputBounds } from '@/features/nutrition';
import type { ActivityLevel, Goal, Sex } from '@/features/nutrition';
import type { ProfileInput } from '@/features/profile';
import { weightOriginSchema } from '@/features/profile';

const numberText = (min: number, max: number, label: string, integer = false) => z.string().trim()
  .refine((value) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max && (!integer || Number.isInteger(Number(value))), `Enter ${label} from ${min} to ${max}${integer ? ' in whole years' : ''}.`);
export const aboutYouSchema = z.object({
  sex: nutritionProfileSchema.shape.sex,
  age: numberText(nutritionInputBounds.age.min, nutritionInputBounds.age.max, 'an age', true),
  heightCm: numberText(nutritionInputBounds.heightCm.min, nutritionInputBounds.heightCm.max, 'a height in cm'),
  weightKg: numberText(nutritionInputBounds.weightKg.min, nutritionInputBounds.weightKg.max, 'a weight in kg'),
  activityLevel: nutritionProfileSchema.shape.activityLevel,
});
export const onboardingFormSchema = aboutYouSchema.extend({
  weightOrigin: weightOriginSchema, goal: z.enum(['fatLoss', 'maintenance', 'muscleGain']), ratePreset: z.number().nullable(),
  weeklySessionTarget: z.number().int().min(1).max(6),
}).refine((value) => goalSelectionSchema.safeParse(value).success, { path: ['ratePreset'], message: 'Choose a rate for your Goal.' });
export type OnboardingDraft = {
  sex: Sex | ''; age: string; heightCm: string; weightKg: string; activityLevel: ActivityLevel;
  weightOrigin: ProfileInput['weightOrigin']; goal: Goal; ratePreset: number | null; weeklySessionTarget: number;
};
