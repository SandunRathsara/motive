import { createPlanRepository, createPlanStore, planStore, type PlanAppendResult, type PlanState } from '@/features/plan';
import { createProfileRepository } from '@/features/profile';
import { getLatestKnownTrendWeight, getTrendWeight } from '@/features/health';
import type { SqlExecutor } from '@/lib/persistence';
import { dayKey } from '@/lib/utils/time';
import { z } from 'zod';
import { goalSelectionSchema } from '../nutrition.schemas';
import { calculateCalorieFloor, calculateDailyEnergyOffset, clampCalorieTarget } from '../nutrition.utils';
import type { CalorieFloor, GoalSelection } from '../nutrition.types';

export class NutritionEditError extends Error {
  constructor(readonly code: 'invalidInput' | 'invalidRecord' | 'belowFloor', readonly floor?: CalorieFloor) { super(code); this.name = 'NutritionEditError'; }
}
const positiveInteger = z.number().int().positive();
export type GoalEditResult = PlanAppendResult & { clamped: boolean; floor?: CalorieFloor; suggestedSlowerPreset: GoalSelection['ratePreset'] };

export function createNutritionEdits(options: { connection?: SqlExecutor; now?: () => number } = {}) {
  const store = options.connection ? createPlanStore(options) : planStore;
  async function referenceWeight(profileWeightKg: number) {
    try {
      const now = (options.now ?? Date.now)();
      const today = dayKey(now);
      const trend = await getTrendWeight(today, { now });
      if (trend.known) return trend.value;
      const historical = await getLatestKnownTrendWeight({ now });
      return historical.known ? historical.value : profileWeightKg;
    } catch { return profileWeightKg; }
  }
  async function current(): Promise<PlanState> {
    const result = await store.current();
    if (result.status !== 'present' || !result.version) throw new NutritionEditError('invalidRecord');
    return result.version.snapshot;
  }
  async function profileAndWeight() {
    const result = await createProfileRepository(options.connection).read();
    if (!result.profile || result.skippedCount) throw new NutritionEditError('invalidRecord');
    return { profile: result.profile, weightKg: await referenceWeight(result.profile.weightKg) };
  }
  return {
    async editGoal(selection: GoalSelection): Promise<GoalEditResult> {
      const parsed = goalSelectionSchema.safeParse(selection);
      if (!parsed.success) throw new NutritionEditError('invalidInput');
      const state = await current();
      if (state.goal === selection.goal && state.ratePreset === selection.ratePreset) {
        return { ...await store.appendVersion('Your edit', {}), clamped: false, suggestedSlowerPreset: null };
      }
      const { profile, weightKg } = await profileAndWeight();
      const estimates = await createPlanRepository(options.connection).readStartingEstimate();
      if (!estimates.estimate || estimates.skippedCount) throw new NutritionEditError('invalidRecord');
      const floor = calculateCalorieFloor(profile, weightKg);
      const { kcalTarget, ...notice } = clampCalorieTarget(estimates.estimate.valueKcal + calculateDailyEnergyOffset(weightKg, parsed.data), floor, parsed.data);
      const result = await store.appendVersion('Your edit', {
        ...parsed.data, kcalTarget,
      });
      return { ...result, floor, ...notice };
    },
    async editKcalTarget(kcalTarget: number) {
      if (!positiveInteger.safeParse(kcalTarget).success) throw new NutritionEditError('invalidInput');
      const state = await current();
      if (state.kcalTarget === kcalTarget) return store.appendVersion('Your edit', {});
      const { profile, weightKg } = await profileAndWeight();
      const floor = calculateCalorieFloor(profile, weightKg);
      if (kcalTarget < floor.kcal) throw new NutritionEditError('belowFloor', floor);
      return store.appendVersion('Your edit', { kcalTarget, kcalOrigin: 'yourEdit' });
    },
    async editProteinFloor(proteinFloorG: number) {
      if (!positiveInteger.safeParse(proteinFloorG).success) throw new NutritionEditError('invalidInput');
      const state = await current();
      if (state.proteinFloorG === proteinFloorG) return store.appendVersion('Your edit', {});
      const { weightKg } = await profileAndWeight();
      return store.appendVersion('Your edit', { proteinFloorG, proteinBasisWeightKg: weightKg });
    },
  };
}
export const nutritionEdits = createNutritionEdits();
