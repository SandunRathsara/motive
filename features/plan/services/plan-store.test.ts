import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import type { PlanState } from '../plan.schemas';
import { createPlanRepository } from './plan-repository';
import { appendVersionIn, createPlanStore } from './plan-store';

const now = new Date(2026, 10, 8, 12).getTime();
const starterTrainingProgram: PlanState['trainingProgram'] = { rotation: [{
  id: 'full-body', name: 'Full Body',
  exercises: [{ id: 'full-body-back-squat', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 }],
}] };
const initial: PlanState = {
  goal: 'fatLoss', ratePreset: -0.5, kcalTarget: 2250, kcalOrigin: 'startingEstimate',
  proteinFloorG: 144, proteinBasisWeightKg: 80, weeklySessionTarget: 3, trainingProgram: starterTrainingProgram,
};
let db: SqlExecutor;
beforeEach(async () => {
  db = nodeExecutor();
  await migrateRecord(db, async () => {});
  useRecordLifecycle.setState({ phase: 'ready' });
  await createPlanRepository(db).insertInitial(initial, now);
});
afterEach(async () => { await db.close(); useRecordLifecycle.setState({ phase: 'ready' }); });

test('appendVersionIn joins the caller transaction and commits with it', async () => {
  const result = await db.transaction((tx) => appendVersionIn(tx, 'Your edit', { weeklySessionTarget: 4 }, now + 1));
  expect(result.changedFields).toEqual(['weeklySessionTarget']);
  expect(result.version).toMatchObject({ number: 2, source: 'Your edit', createdAt: now + 1, snapshot: { weeklySessionTarget: 4 } });
  expect((await createPlanStore({ connection: db }).current()).version?.number).toBe(2);
});

test('appendVersionIn rolls back with the caller transaction', async () => {
  await expect(db.transaction(async (tx) => {
    await appendVersionIn(tx, 'Your edit', { weeklySessionTarget: 5 }, now + 1);
    throw new Error('later step failed');
  })).rejects.toThrow('later step failed');
  expect((await createPlanStore({ connection: db }).current()).version?.number).toBe(1);
});

test('appendVersionIn appends nothing when nothing changed', async () => {
  const result = await db.transaction((tx) => appendVersionIn(tx, 'Your edit', { weeklySessionTarget: 3 }, now + 1));
  expect(result).toEqual({ version: null, changedFields: [] });
  expect((await createPlanStore({ connection: db }).list()).rows).toHaveLength(1);
});

test('appendVersionIn refuses an invalid state with a typed error', async () => {
  await expect(db.transaction((tx) => appendVersionIn(tx, 'Your edit', { weeklySessionTarget: 9 }, now + 1)))
    .rejects.toMatchObject({ code: 'invalidState' });
});
