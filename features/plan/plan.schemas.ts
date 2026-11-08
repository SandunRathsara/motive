import { z } from 'zod';
import { storedJsonSchema } from '@/lib/contracts/stored-json';
import { trainingProgramSchema } from '@/lib/contracts/training-program';

const fields = {
  goal: z.enum(['fatLoss', 'maintenance', 'muscleGain']),
  ratePreset: z.union([z.literal(-0.25), z.literal(-0.5), z.literal(-0.75), z.null(), z.literal(0.1), z.literal(0.25), z.literal(0.4)]),
  kcalTarget: z.number().int().positive(), kcalOrigin: z.enum(['startingEstimate', 'yourEdit', 'planChange']),
  proteinFloorG: z.number().int().positive(), proteinBasisWeightKg: z.number().positive(),
  weeklySessionTarget: z.number().int().min(1).max(6), trainingProgram: trainingProgramSchema,
};
export const planFieldSchema = z.enum(['goal', 'ratePreset', 'kcalTarget', 'kcalOrigin', 'proteinFloorG', 'proteinBasisWeightKg', 'weeklySessionTarget', 'trainingProgram']);
export type PlanField = z.infer<typeof planFieldSchema>;
export const planStateSchema = z.object(fields).strict().refine((state) =>
  state.goal === 'maintenance' ? state.ratePreset === null : state.ratePreset !== null &&
    (state.goal === 'fatLoss' ? [-0.25, -0.5, -0.75] : [0.1, 0.25, 0.4]).includes(state.ratePreset),
{ message: 'Rate preset must match Goal', path: ['ratePreset'] });
export type PlanState = z.infer<typeof planStateSchema>;
export const planChangesSchema = z.object(fields).partial().strict();
export type PlanChanges = z.infer<typeof planChangesSchema>;
const fieldDiff = <T extends z.ZodType>(schema: T) => z.object({ from: schema.nullable(), to: schema }).strict().optional();
export const planDiffSchema = z.object({
  goal: fieldDiff(fields.goal), ratePreset: fieldDiff(fields.ratePreset),
  kcalTarget: fieldDiff(fields.kcalTarget), kcalOrigin: fieldDiff(fields.kcalOrigin),
  proteinFloorG: fieldDiff(fields.proteinFloorG), proteinBasisWeightKg: fieldDiff(fields.proteinBasisWeightKg),
  weeklySessionTarget: fieldDiff(fields.weeklySessionTarget), trainingProgram: fieldDiff(fields.trainingProgram),
}).strict();
export type PlanDiff = z.infer<typeof planDiffSchema>;
export const planVersionSchema = z.object({
  number: z.number().int().positive(), createdAt: z.number().int(),
  source: z.enum(['Starting plan', 'Your edit', 'Plan Change', 'Revert']), sourceRef: z.number().int().positive().nullable(),
  snapshot: planStateSchema, diff: planDiffSchema,
}).strict().refine((version) => (version.source === 'Starting plan' || version.source === 'Your edit') ? version.sourceRef === null : version.sourceRef !== null)
  .refine((version) => (version.number === 1) === (version.source === 'Starting plan'))
  .refine((version) => {
    const changed = planFieldSchema.options.filter((field) => version.diff[field] !== undefined);
    if (version.number === 1 && changed.length !== planFieldSchema.options.length) return false;
    if (!changed.length) return false;
    return changed.every((field) => {
      const change = version.diff[field]!;
      return JSON.stringify(change.to) === JSON.stringify(version.snapshot[field]) &&
        (version.number === 1 ? change.from === null :
          (change.from !== null || field === 'ratePreset') && JSON.stringify(change.from) !== JSON.stringify(change.to));
    });
  }, { message: 'Diff must describe the snapshot changes' });
export type PlanVersion = z.infer<typeof planVersionSchema>;
export type PlanSource = 'Your edit' | { source: 'Plan Change' | 'Revert'; sourceRef: number };
export const planVersionRowSchema = z.object({
  number: z.number(), created_at: z.number(), source: z.string(), source_ref: z.number().nullable(),
  snapshot_json: storedJsonSchema, diff_json: storedJsonSchema,
}).strict().transform((row) => ({
  number: row.number, createdAt: row.created_at, source: row.source, sourceRef: row.source_ref,
  snapshot: row.snapshot_json, diff: row.diff_json,
})).pipe(planVersionSchema);

// The first damping baseline belongs to plan history, not the immutable Profile.
export const startingEstimateSchema = z.object({ valueKcal: z.number().positive(), createdAt: z.number().int() }).strict();
export type StartingEstimate = z.infer<typeof startingEstimateSchema>;
export const startingEstimateRowSchema = z.object({ id: z.literal(1), value_kcal: z.number(), created_at: z.number() }).strict()
  .transform((row) => ({ valueKcal: row.value_kcal, createdAt: row.created_at })).pipe(startingEstimateSchema);
