import { z } from 'zod';
import { storedJsonSchema } from '@/lib/contracts/stored-json';

export const weightOriginSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('typed') }).strict(),
  z.object({ kind: z.literal('health'), sampleTime: z.number().int(), sourceName: z.string().min(1) }).strict(),
]);
export const profileInputSchema = z.object({
  sex: z.enum(['female', 'male']), age: z.number().int().min(18).max(90),
  heightCm: z.number().min(120).max(230), activityLevel: z.union([z.literal(1.3), z.literal(1.5), z.literal(1.7)]),
  weightKg: z.number().min(35).max(250), weightOrigin: weightOriginSchema,
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
