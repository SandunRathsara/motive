import type { SqlExecutor } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { completeOnboarding, readOnboardingStatus } from '@/features/onboarding';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createPlanStore, createPlanRepository, planStore } from '@/features/plan';
import { createProfileRepository } from '@/features/profile';
import { healthSignalsExportSection } from '@/features/health';

const now = Date.parse('2026-11-08T12:00:00Z');
const inputs = {
  sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80,
  weightOrigin: { kind: 'typed' }, goal: 'fatLoss', ratePreset: -0.5, weeklySessionTarget: 3,
} as const;
let db: SqlExecutor;
beforeEach(async () => {
  db = nodeExecutor();
  expect(await migrateRecord(db, async () => {})).toBeNull();
  useRecordLifecycle.setState({ phase: 'ready' });
});
afterEach(async () => { planStore.clearChangeListeners(); await db.close(); useRecordLifecycle.setState({ phase: 'ready' }); jest.restoreAllMocks(); });

test('onboarding commits a starting plan; edits append numbered full snapshots and from-to diffs', async () => {
  const result = await completeOnboarding(inputs, { connection: db, now: () => now });
  expect(result.version).toMatchObject({ number: 1, createdAt: now, source: 'Starting plan', sourceRef: null });
  expect(result.version.snapshot).toMatchObject({
    goal: 'fatLoss', ratePreset: -0.5, kcalTarget: 2250, kcalOrigin: 'startingEstimate',
    proteinFloorG: 144, proteinBasisWeightKg: 80, weeklySessionTarget: 3,
    trainingProgram: { rotation: [{ id: 'full-body' }] },
  });
  const store = createPlanStore({ connection: db, now: () => now + 1000 });
  const edit = await store.appendVersion('Your edit', { kcalTarget: 2350, kcalOrigin: 'yourEdit' });
  expect(edit.changedFields).toEqual(['kcalTarget', 'kcalOrigin']);
  expect(edit.version).toMatchObject({ number: 2, source: 'Your edit', diff: {
    kcalTarget: { from: 2250, to: 2350 }, kcalOrigin: { from: 'startingEstimate', to: 'yourEdit' },
  } });
  expect((await store.current()).version).toEqual(edit.version);
  expect((await store.list()).rows.map((row) => row.number)).toEqual([2, 1]);
  expect((await store.byNumber(1)).version).toEqual(result.version);
});

test('unchanged re-saves append nothing and emit no change', async () => {
  await completeOnboarding(inputs, { connection: db, now: () => now });
  const store = createPlanStore({ connection: db });
  const listener = jest.fn();
  store.subscribe(listener);
  expect(await store.appendVersion('Your edit', { kcalTarget: 2250 })).toEqual({ version: null, changedFields: [] });
  expect(await store.appendVersion('Your edit', {})).toEqual({ version: null, changedFields: [] });
  expect((await store.list()).rows.map((version) => version.number)).toEqual([1]);
  expect(listener).not.toHaveBeenCalled();
});

test('field history finds the latest change strictly after N; training-only edits keep the nutrition clock', async () => {
  await completeOnboarding(inputs, { connection: db, now: () => now });
  let clock = now + 1000;
  const store = createPlanStore({ connection: db, now: () => clock });
  await store.appendVersion('Your edit', { weeklySessionTarget: 4 });
  expect(await store.nutritionTargetStart()).toEqual({ createdAt: now, versionNumber: 1, skippedCount: 0 });
  expect((await store.latestChangeAfter(1, 'kcalTarget')).version).toBeNull();
  clock += 1000;
  await store.appendVersion({ source: 'Plan Change', sourceRef: 7 }, { kcalTarget: 2400, kcalOrigin: 'planChange' });
  clock += 1000;
  await store.appendVersion('Your edit', { weeklySessionTarget: 5 });
  expect((await store.latestChangeAfter(1, 'weeklySessionTarget')).version?.number).toBe(4);
  expect((await store.latestChangeAfter(4, 'weeklySessionTarget')).version).toBeNull();
  expect((await store.latestChangeAfter(1, 'kcalTarget')).version).toMatchObject({ number: 3, source: 'Plan Change', sourceRef: 7 });
  expect(await store.nutritionTargetStart()).toEqual({ createdAt: now + 2000, versionNumber: 3, skippedCount: 0 });
  clock += 1000;
  await store.appendVersion('Your edit', { goal: 'maintenance', ratePreset: null });
  expect(await store.nutritionTargetStart()).toEqual({ createdAt: now + 4000, versionNumber: 5, skippedCount: 0 });
  clock += 1000;
  await store.appendVersion('Your edit', { proteinFloorG: 150 });
  expect(await store.nutritionTargetStart()).toEqual({ createdAt: now + 5000, versionNumber: 6, skippedCount: 0 });
});

test('a failure after every onboarding write rolls back Profile, estimate and v1 and emits nothing', async () => {
  const listener = jest.fn();
  planStore.subscribe(listener);
  await expect(completeOnboarding(inputs, { connection: db, now: () => now, beforeCommit: () => { throw new Error('injected'); } })).rejects.toMatchObject({ code: 'commitFailed' });
  expect((await createProfileRepository(db).read()).profile).toBeNull();
  expect((await createPlanRepository(db).readStartingEstimate()).estimate).toBeNull();
  expect(await createPlanStore({ connection: db }).current()).toEqual({ status: 'none', version: null, skippedCount: 0 });
  expect(listener).not.toHaveBeenCalled();
  const saved = await completeOnboarding(inputs, { connection: db, now: () => now });
  expect(saved.version.number).toBe(1);
  expect((await createProfileRepository(db).read()).profile).toEqual({
    sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80, weightOrigin: { kind: 'typed' }, createdAt: now,
  });
  expect((await createPlanRepository(db).readStartingEstimate()).estimate).toEqual({ valueKcal: 2670, createdAt: now });
  expect(listener).toHaveBeenCalledTimes(1);
});

test('invalid resulting state is refused without consuming a number', async () => {
  await completeOnboarding(inputs, { connection: db });
  const store = createPlanStore({ connection: db });
  for (const changes of [
    { kcalTarget: 0 }, { proteinFloorG: -1 }, { weeklySessionTarget: 7 }, { goal: 'maintenance' },
    { trainingProgram: { rotation: [] } },
  ]) {
    await expect(store.appendVersion('Your edit', changes as never)).rejects.toMatchObject({ code: 'invalidState' });
  }
  const program = (await store.current()).version!.snapshot.trainingProgram;
  const badProgram = { rotation: [{ ...program.rotation[0], exercises: [{ ...program.rotation[0].exercises[0], exerciseId: 'missing' }] }] };
  await expect(store.appendVersion('Your edit', { trainingProgram: badProgram })).rejects.toMatchObject({ code: 'invalidState' });
  expect((await store.appendVersion('Your edit', { weeklySessionTarget: 4 })).version?.number).toBe(2);
});

test('invalid rows are counted, retained, and never mistaken for no plan', async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  await db.run('INSERT INTO plan_version VALUES (1, ?, ?, NULL, ?, ?)', [now, 'Starting plan', '{bad JSON', '{}']);
  const store = createPlanStore({ connection: db });
  expect(await store.current()).toEqual({ status: 'invalid', version: null, skippedCount: 1 });
  expect(await store.list()).toEqual({ rows: [], skippedCount: 1 });
  await expect(store.appendVersion('Your edit', { kcalTarget: 2350 })).rejects.toMatchObject({ code: 'invalidRows', skippedCount: 1 });
  expect(await store.current()).toEqual({ status: 'invalid', version: null, skippedCount: 1 });
});

test('a stored diff inconsistent with its snapshot is counted as invalid, not accepted as history', async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  const initial = await completeOnboarding(inputs, { connection: db, now: () => now });
  await db.run('INSERT INTO plan_version VALUES (2, ?, ?, NULL, ?, ?)', [now + 1000, 'Your edit', JSON.stringify(initial.version.snapshot), JSON.stringify({ kcalTarget: { from: 2250, to: 9999 } })]);
  expect(await createPlanStore({ connection: db }).current()).toMatchObject({ status: 'invalid', skippedCount: 1 });
});

test('the onboarding gate distinguishes a fresh record from invalid Profile or estimate rows', async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  expect(await readOnboardingStatus(db)).toEqual({ status: 'none', skippedCount: 0 });
  await completeOnboarding(inputs, { connection: db, now: () => now });
  expect(await readOnboardingStatus(db)).toEqual({ status: 'present', skippedCount: 0 });
  // Corrupt fixtures only: production writes never update these records.
  await db.run('UPDATE profile SET weight_origin_json = ?', ['not JSON']);
  await db.run('UPDATE starting_estimate SET value_kcal = -1');
  expect((await createProfileRepository(db).read()).skippedCount).toBe(1);
  expect((await createPlanRepository(db).readStartingEstimate()).skippedCount).toBe(1);
  expect(await readOnboardingStatus(db)).toEqual({ status: 'invalid', skippedCount: 2 });
});

test('concurrent edits are serialized without lost fields or duplicate version numbers', async () => {
  await completeOnboarding(inputs, { connection: db, now: () => now });
  const store = createPlanStore({ connection: db, now: () => now + 1000 });
  const results = await Promise.all([
    store.appendVersion('Your edit', { kcalTarget: 2350, kcalOrigin: 'yourEdit' }),
    store.appendVersion('Your edit', { proteinFloorG: 150 }),
  ]);
  expect(results.map((result) => result.version?.number)).toEqual([2, 3]);
  expect((await store.current()).version?.snapshot).toMatchObject({ kcalTarget: 2350, kcalOrigin: 'yourEdit', proteinFloorG: 150 });
  expect((await store.byNumber(3)).version?.diff).toEqual({ proteinFloorG: { from: 144, to: 150 } });
});

test('Health-prefilled weight stays Profile provenance and duplicate onboarding never overwrites it', async () => {
  const healthInput = { ...inputs, weightOrigin: { kind: 'health', sampleTime: now - 1000, sourceName: 'Scale' } } as const;
  await completeOnboarding(healthInput, { connection: db, now: () => now });
  expect((await createProfileRepository(db).read()).profile?.weightOrigin).toEqual({ kind: 'health', sampleTime: now - 1000, sourceName: 'Scale' });
  expect(await healthSignalsExportSection.read(db)).toEqual({ records: [], skippedCount: 0 });
  await expect(completeOnboarding(inputs, { connection: db, now: () => now + 1000 })).rejects.toMatchObject({ code: 'alreadyStarted' });
  expect((await createProfileRepository(db).read()).profile?.weightOrigin.kind).toBe('health');
  expect((await createPlanStore({ connection: db }).list()).rows).toHaveLength(1);
});

test('writes are blocked during erasure, including an erase that starts before onboarding commits', async () => {
  await expect(completeOnboarding(inputs, { connection: db, beforeCommit: () => { useRecordLifecycle.getState().beginErase(); } })).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  expect((await createProfileRepository(db).read()).profile).toBeNull();
  expect((await createPlanRepository(db).readStartingEstimate()).estimate).toBeNull();
  await expect(createProfileRepository(db).insert({
    sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80, weightOrigin: { kind: 'typed' }, createdAt: now,
  })).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  await expect(createPlanStore({ connection: db }).appendVersion('Your edit', {})).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  useRecordLifecycle.setState({ phase: 'ready' });
  expect(await readOnboardingStatus(db)).toEqual({ status: 'none', skippedCount: 0 });
});

test('change observers run only for commits; throwing or unsubscribed observers cannot turn saved into failure', async () => {
  const onboardListener = jest.fn();
  planStore.subscribe(onboardListener);
  await completeOnboarding(inputs, { connection: db, beforeCommit: () => { expect(onboardListener).not.toHaveBeenCalled(); } });
  expect(onboardListener).toHaveBeenCalledTimes(1);
  const store = createPlanStore({ connection: db });
  const observer = jest.fn(() => { throw new Error('observer failure'); });
  const unsubscribe = store.subscribe(observer);
  expect((await store.appendVersion('Your edit', { weeklySessionTarget: 4 })).version?.number).toBe(2);
  expect((await store.byNumber(2)).version?.snapshot.weeklySessionTarget).toBe(4);
  expect(observer).toHaveBeenCalledTimes(1);
  unsubscribe();
  await store.appendVersion('Your edit', { weeklySessionTarget: 5 });
  expect(observer).toHaveBeenCalledTimes(1);
  expect(store.hasChangeListeners()).toBe(false);
});

test('an incomplete setup never becomes a fresh-install gate', async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  await createProfileRepository(db).insert({
    sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80, weightOrigin: { kind: 'typed' }, createdAt: now,
  });
  expect(await readOnboardingStatus(db)).toEqual({ status: 'invalid', skippedCount: 0 });
});

test('invalid onboarding inputs fail before saving any part of setup', async () => {
  for (const invalid of [{ ...inputs, weightKg: 0 }, { ...inputs, age: 17 }, { ...inputs, weeklySessionTarget: 0 }, { ...inputs, goal: 'maintenance' as const }]) {
    await expect(completeOnboarding(invalid, { connection: db })).rejects.toMatchObject({ code: 'invalidInput' });
    expect(await readOnboardingStatus(db)).toEqual({ status: 'none', skippedCount: 0 });
  }
});

test('a valid older version does not hide an invalid latest row, and appends are refused', async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  await completeOnboarding(inputs, { connection: db, now: () => now });
  await db.run('INSERT INTO plan_version VALUES (2, ?, ?, NULL, ?, ?)', [now + 1000, 'Your edit', 'null', '{}']);
  const store = createPlanStore({ connection: db });
  expect(await store.current()).toMatchObject({ status: 'invalid', version: { number: 1 }, skippedCount: 1 });
  expect(await readOnboardingStatus(db)).toEqual({ status: 'invalid', skippedCount: 1 });
  await expect(store.appendVersion('Your edit', { weeklySessionTarget: 4 })).rejects.toMatchObject({ code: 'invalidRows', skippedCount: 1 });
});
