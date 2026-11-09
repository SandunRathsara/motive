import { createPlanRepository, type PlanState } from '@/features/plan';
import type { SqlExecutor } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { starterTrainingProgram } from '../workouts.content';
import type { TrainingProgram } from '../workouts.schemas';

/** Test-only helpers shared by the workout service tests. */
export const t0 = Date.UTC(2026, 10, 9, 10); // Monday 9 Nov 2026, 10:00 at UTC+0
export const minute = 60_000;
export const day = 86_400_000;

export function planState(overrides: Partial<PlanState> = {}): PlanState {
  return {
    goal: 'fatLoss', ratePreset: -0.5, kcalTarget: 2250, kcalOrigin: 'startingEstimate',
    proteinFloorG: 144, proteinBasisWeightKg: 80, weeklySessionTarget: 3, trainingProgram: starterTrainingProgram, ...overrides,
  };
}

export async function openTestRecord(program: TrainingProgram = starterTrainingProgram, createdAt = t0 - 30 * day): Promise<SqlExecutor> {
  const db = nodeExecutor();
  await migrateRecord(db, async () => {});
  useRecordLifecycle.setState({ phase: 'ready' });
  await createPlanRepository(db).insertInitial(planState({ trainingProgram: program }), createdAt);
  return db;
}

export function fakeClock(start = t0) {
  let current = start;
  return { now: () => current, set: (value: number) => { current = value; }, advance: (ms: number) => { current += ms; } };
}

export function counterIds() {
  let counter = 0;
  return () => `id-${String(++counter).padStart(4, '0')}`;
}

/** A fixed-offset zone (minutes east of UTC) keeps week/day maths machine-independent. */
export const utcOffset = () => 0;
