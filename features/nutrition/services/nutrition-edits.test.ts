import { createPlanRepository, createPlanStore, type PlanState } from '@/features/plan';
import { createProfileRepository } from '@/features/profile';
import { getLatestKnownTrendWeight, getTrendWeight } from '@/features/health';
import { starterTrainingProgram } from '@/features/workouts';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createNutritionEdits } from './nutrition-edits';

jest.mock('@/features/health', () => ({ getTrendWeight: jest.fn(), getLatestKnownTrendWeight: jest.fn() }));
const now = new Date(2026, 10, 8, 12).getTime();
const profile = { sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80, weightOrigin: { kind: 'typed' }, createdAt: now } as const;
const initial: PlanState = {
  goal: 'fatLoss', ratePreset: -0.5, kcalTarget: 2250, kcalOrigin: 'startingEstimate',
  proteinFloorG: 144, proteinBasisWeightKg: 80, weeklySessionTarget: 3, trainingProgram: starterTrainingProgram,
};
let db: SqlExecutor;
beforeEach(async () => {
  db = nodeExecutor();
  await migrateRecord(db, async () => {});
  useRecordLifecycle.setState({ phase: 'ready' });
  await createProfileRepository(db).insert(profile);
  await createPlanRepository(db).insertStartingEstimate({ valueKcal: 2670, createdAt: now });
  await createPlanRepository(db).insertInitial(initial, now);
  jest.mocked(getTrendWeight).mockResolvedValue({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  jest.mocked(getLatestKnownTrendWeight).mockResolvedValue({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
});
afterEach(async () => { await db.close(); jest.resetAllMocks(); useRecordLifecycle.setState({ phase: 'ready' }); });

test('a Goal edit recomputes from the stored starting estimate, keeps protein and the starting-estimate label', async () => {
  const edit = await createNutritionEdits({ connection: db, now: () => now + 1000 }).editGoal({ goal: 'muscleGain', ratePreset: 0.25 });
  expect(edit.clamped).toBe(false);
  expect(edit.version).toMatchObject({ number: 2, source: 'Your edit', snapshot: {
    goal: 'muscleGain', ratePreset: 0.25, kcalTarget: 2900, kcalOrigin: 'startingEstimate', proteinFloorG: 144,
  } });
  expect((await createPlanStore({ connection: db }).current()).version).toEqual(edit.version);
});

test('a Goal edit uses known Trend Weight, clamps at the floor and suggests the next slower preset', async () => {
  jest.mocked(getTrendWeight).mockResolvedValue({ known: true, value: 180, provenance: [], coverage: { known: 2, of: 7, unit: 'days' } });
  const edit = await createNutritionEdits({ connection: db, now: () => now }).editGoal({ goal: 'fatLoss', ratePreset: -0.75 });
  expect(edit).toMatchObject({ clamped: true, floor: { kcal: 2780, reason: 'bmr' }, suggestedSlowerPreset: -0.5 });
  expect(edit.version?.snapshot).toMatchObject({ kcalTarget: 2780, proteinFloorG: 144, proteinBasisWeightKg: 80 });
});

test('a below-floor manual kcal edit is refused with the floor and reason; a valid integer is saved as Your edit', async () => {
  const edits = createNutritionEdits({ connection: db, now: () => now });
  await expect(edits.editKcalTarget(1779)).rejects.toMatchObject({ code: 'belowFloor', floor: { kcal: 1780, reason: 'bmr' } });
  expect((await createPlanStore({ connection: db }).list()).rows).toHaveLength(1);
  const saved = await edits.editKcalTarget(1780);
  expect(saved.version).toMatchObject({ number: 2, source: 'Your edit', snapshot: { kcalTarget: 1780, kcalOrigin: 'yourEdit' } });
});

test('a direct protein edit keeps kcal and records the reference weight at which the floor was set', async () => {
  jest.mocked(getTrendWeight).mockResolvedValue({ known: true, value: 82, provenance: [], coverage: { known: 1, of: 7, unit: 'days' } });
  const saved = await createNutritionEdits({ connection: db, now: () => now }).editProteinFloor(160);
  expect(saved.version).toMatchObject({ source: 'Your edit', snapshot: { proteinFloorG: 160, proteinBasisWeightKg: 82, kcalTarget: 2250, kcalOrigin: 'startingEstimate' } });
});

test('unchanged re-saves append nothing, do not relabel kcal or reset protein basis, and do not recompute a manual target', async () => {
  const edits = createNutritionEdits({ connection: db, now: () => now });
  jest.mocked(getTrendWeight).mockResolvedValue({ known: true, value: 82, provenance: [], coverage: { known: 1, of: 7, unit: 'days' } });
  expect(await edits.editKcalTarget(2250)).toMatchObject({ version: null, changedFields: [] });
  expect(await edits.editProteinFloor(144)).toMatchObject({ version: null, changedFields: [] });
  await edits.editKcalTarget(2400);
  expect(await edits.editGoal({ goal: 'fatLoss', ratePreset: -0.5 })).toMatchObject({ version: null, changedFields: [] });
  const store = createPlanStore({ connection: db });
  expect((await store.list()).rows).toHaveLength(2);
  expect((await store.current()).version?.snapshot).toMatchObject({ kcalTarget: 2400, kcalOrigin: 'yourEdit', proteinBasisWeightKg: 80 });
});

test('unknown current Trend Weight uses the most recent known historical Trend Weight, not a raw daily average', async () => {
  jest.mocked(getLatestKnownTrendWeight).mockResolvedValue({ known: true, value: 90, provenance: [], coverage: { known: 1, of: 7, unit: 'days' } });
  await expect(createNutritionEdits({ connection: db, now: () => now }).editKcalTarget(1879))
    .rejects.toMatchObject({ code: 'belowFloor', floor: { kcal: 1880, reason: 'bmr' } });
});

test.each(['current', 'historicalTrend'])('Health read failure (%s) falls back to Profile weight without blocking an edit', async (failure) => {
  if (failure === 'current') jest.mocked(getTrendWeight).mockRejectedValue(new Error('Health read failed'));
  if (failure === 'historicalTrend') jest.mocked(getLatestKnownTrendWeight).mockRejectedValue(new Error('Health read failed'));
  const result = await createNutritionEdits({ connection: db, now: () => now }).editProteinFloor(160);
  expect(result.version?.snapshot).toMatchObject({ proteinFloorG: 160, proteinBasisWeightKg: 80 });
});

test('a sex-minimum refusal includes that reason and a fractional BMR floor is rounded up for stored integer kcal', async () => {
  jest.mocked(getTrendWeight).mockResolvedValue({ known: true, value: 40, provenance: [], coverage: { known: 1, of: 7, unit: 'days' } });
  const edits = createNutritionEdits({ connection: db, now: () => now });
  await expect(edits.editKcalTarget(1499)).rejects.toMatchObject({ code: 'belowFloor', floor: { kcal: 1500, reason: 'sexMinimum' } });
  jest.mocked(getTrendWeight).mockResolvedValue({ known: true, value: 180.125, provenance: [], coverage: { known: 1, of: 7, unit: 'days' } });
  const result = await edits.editGoal({ goal: 'fatLoss', ratePreset: -0.25 });
  expect(result).toMatchObject({ clamped: true, floor: { kcal: 2781.25 }, suggestedSlowerPreset: null });
  expect(result.version?.snapshot.kcalTarget).toBe(2782);
});

test.each([0, -1, 160.5, NaN, Infinity])('non-positive or non-integer manual input (%s) saves nothing', async (value) => {
  const edits = createNutritionEdits({ connection: db, now: () => now });
  await expect(edits.editProteinFloor(value)).rejects.toMatchObject({ code: 'invalidInput' });
  await expect(edits.editKcalTarget(value)).rejects.toMatchObject({ code: 'invalidInput' });
  expect((await createPlanStore({ connection: db }).list()).rows).toHaveLength(1);
});

test('a Goal edit after a manual kcal edit does not restore the starting-estimate label', async () => {
  const edits = createNutritionEdits({ connection: db, now: () => now });
  await edits.editKcalTarget(2400);
  const result = await edits.editGoal({ goal: 'maintenance', ratePreset: null });
  expect(result.version?.snapshot).toMatchObject({ kcalTarget: 2650, kcalOrigin: 'yourEdit', proteinFloorG: 144 });
});
