import { requireRecord, type SqlExecutor } from '@/lib/persistence';
import { calculateStartingPlan, startingPlanInputSchema } from '@/features/nutrition';
import { createPlanRepository, planStore, planFieldSchema, planStateSchema, PlanStoreError } from '@/features/plan';
import { createProfileRepository, profileInputSchema } from '@/features/profile';
import { starterTrainingProgram } from '@/features/workouts';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { z } from 'zod';

export const onboardingInputSchema = profileInputSchema.extend({
  goal: z.enum(['fatLoss', 'maintenance', 'muscleGain']), ratePreset: z.number().nullable(),
  weeklySessionTarget: z.number().int().min(1).max(6),
}).strict().refine((input) => startingPlanInputSchema.safeParse(input).success, { message: 'Invalid Goal or preset', path: ['ratePreset'] });
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
export class OnboardingError extends Error {
  constructor(readonly code: 'invalidInput' | 'alreadyStarted' | 'invalidRows' | 'recordWritesBlocked' | 'commitFailed' | 'readFailed', readonly skippedCount = 0) { super(code); this.name = 'OnboardingError'; }
}

export async function completeOnboarding(inputs: OnboardingInput, options: {
  connection?: SqlExecutor; now?: () => number;
  /** Test seam: throw after all writes, before COMMIT. Never used by the UI. */
  beforeCommit?: () => void | Promise<void>;
} = {}) {
  const parsed = onboardingInputSchema.safeParse(inputs);
  if (!parsed.success) throw new OnboardingError('invalidInput');
  if (!recordWritesAllowed()) throw new OnboardingError('recordWritesBlocked');
  const input = parsed.data;
  const calculation = calculateStartingPlan(startingPlanInputSchema.parse(input));
  const createdAt = (options.now ?? Date.now)();
  const profile = { ...profileInputSchema.parse({ sex: input.sex, age: input.age, heightCm: input.heightCm, activityLevel: input.activityLevel, weightKg: input.weightKg, weightOrigin: input.weightOrigin }), createdAt };
  const state = planStateSchema.parse({
    goal: input.goal, ratePreset: input.ratePreset, kcalTarget: calculation.kcalTarget, kcalOrigin: 'startingEstimate',
    proteinFloorG: calculation.proteinFloorG, proteinBasisWeightKg: input.weightKg,
    weeklySessionTarget: input.weeklySessionTarget, trainingProgram: starterTrainingProgram,
  });
  try {
    const result = await (options.connection ?? requireRecord()).transaction(async (tx) => {
      const profiles = createProfileRepository(tx);
      const plans = createPlanRepository(tx);
      const previous = await profiles.read();
      const estimates = await plans.readStartingEstimate();
      if (previous.skippedCount || estimates.skippedCount) throw new OnboardingError('invalidRows', previous.skippedCount + estimates.skippedCount);
      if (previous.profile || estimates.estimate) throw new OnboardingError('alreadyStarted');
      await profiles.insert(profile);
      await plans.insertStartingEstimate({ valueKcal: calculation.expenditureEstimateKcal, createdAt });
      const version = await plans.insertInitial(state, createdAt);
      await options.beforeCommit?.();
      if (!recordWritesAllowed()) throw new OnboardingError('recordWritesBlocked');
      return { profile, calculation, version };
    });
    planStore.notifyCommitted({ version: result.version, changedFields: [...planFieldSchema.options] });
    return result;
  } catch (error) {
    if (error instanceof OnboardingError) throw error;
    if (error instanceof PlanStoreError && (error.code === 'invalidRows' || error.code === 'alreadyStarted' || error.code === 'recordWritesBlocked')) {
      throw new OnboardingError(error.code, error.skippedCount);
    }
    throw new OnboardingError('commitFailed');
  }
}
