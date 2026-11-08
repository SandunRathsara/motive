import { z } from 'zod';
import { storedJsonSchema } from '@/lib/contracts/stored-json';
import { activityLevelOptions, nutritionInputBounds } from '@/lib/contracts/nutrition-inputs';

export const weightOriginSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('typed') }).strict(),
  z.object({ kind: z.literal('health'), sampleTime: z.number().int(), sourceName: z.string().min(1) }).strict(),
]);
export const profileInputSchema = z.object({
  sex: z.enum(['female', 'male']), age: z.number().int().min(nutritionInputBounds.age.min).max(nutritionInputBounds.age.max),
  heightCm: z.number().min(nutritionInputBounds.heightCm.min).max(nutritionInputBounds.heightCm.max),
  activityLevel: z.literal(activityLevelOptions.map((option) => option.value)),
  weightKg: z.number().min(nutritionInputBounds.weightKg.min).max(nutritionInputBounds.weightKg.max), weightOrigin: weightOriginSchema,
}).strict();
export const profileSchema = profileInputSchema.extend({ createdAt: z.number().int() });
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type WeightOrigin = z.infer<typeof weightOriginSchema>;
export const profileRowSchema = z.object({
  id: z.literal(1), sex: z.string(), age: z.number(), height_cm: z.number(), activity_level: z.number(),
  weight_kg: z.number(), weight_origin_json: storedJsonSchema, created_at: z.number().int(),
}).strict().transform((row) => ({
  sex: row.sex, age: row.age, heightCm: row.height_cm, activityLevel: row.activity_level,
  weightKg: row.weight_kg, weightOrigin: row.weight_origin_json, createdAt: row.created_at,
})).pipe(profileSchema);
