import type { SqlExecutor } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import type { HealthSampleDto } from '../health.schemas';
import { healthSignalTypes } from '../health.types';
import { FakeHealthKitAdapter } from './fake-healthkit';
import { createHealthRepository } from './health-repository';
import { createHealthSync } from './health-sync';
import { healthSignalsExportSection } from './export-section';
import { healthEraseParticipant, setActiveHealthSync } from './erase-participant';

const day = 86_400_000;
const now = Date.parse('2026-11-08T12:00:00Z');
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const weight = (n: number, startMs = now - day): Extract<HealthSampleDto, { type: 'bodyMass' }> => ({
  uuid: uuid(n), type: 'bodyMass', startMs, endMs: startMs, value: 80, unit: 'kg',
  source: { bundleId: 'test.scale', name: 'Scale' }, sourceRevision: { version: '1', productType: null, osVersion: '26.1.0' },
  device: null, userEntered: false,
});

test('an unavailable device marks every type unavailable and returns typed errors without losing history', async () => {
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  await sync.sync('open');
  adapter.available = false;
  const result = await sync.sync('refresh');
  expect(result.types).toHaveLength(5);
  expect(result.types.every((row) => row.errors.some((error) => error.kind === 'unavailable'))).toBe(true);
  expect((await repository.listAvailability()).rows.every((row) => row.state === 'unavailableOnDevice' && row.readState === null)).toBe(true);
  expect((await repository.listSamples('bodyMass')).rows).toHaveLength(1);
  await expect(sync.connect()).resolves.toMatchObject({ types: expect.any(Array) });
});

let db: SqlExecutor;
let adapter: FakeHealthKitAdapter;
let repository: ReturnType<typeof createHealthRepository>;
let logged: jest.SpyInstance;
beforeEach(async () => {
  logged = jest.spyOn(console, 'info').mockImplementation(() => {});
  useRecordLifecycle.setState({ phase: 'ready' });
  db = nodeExecutor();
  expect(await migrateRecord(db, async () => {})).toBeNull();
  adapter = new FakeHealthKitAdapter();
  repository = createHealthRepository(db);
});
afterEach(async () => { await healthEraseParticipant.reset(); await db.close(); useRecordLifecycle.setState({ phase: 'ready' }); jest.restoreAllMocks(); });

test('first backfill is bounded to 90 days and retains its fixed lower bound on later anchored syncs', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1, now - 90 * day - 1));
  adapter.addSample(weight(2, now - 90 * day));
  adapter.addSample(weight(3));
  let clock = now;
  const sync = createHealthSync({ adapter, connection: db, now: () => clock, pageLimit: 1 });
  await sync.sync('open');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(2), uuid(3)]);
  expect((await repository.listAnchors('bodyMass')).rows[0]?.anchor).toBe('fake:bodyMass:3');
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')).toMatchObject({ backfillStartMs: Date.parse('2026-08-10T12:00:00Z') });
  clock += 10 * day;
  adapter.addSample(weight(4, now - 89 * day));
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(2), uuid(4), uuid(3)]);
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')?.backfillStartMs).toBe(Date.parse('2026-08-10T12:00:00Z'));
});

test.each([null, 'A-before'])('re-granting reads recovers history from the prior anchor %s, not the denied query cursor', async (priorAnchor) => {
  adapter.authorizationRequested = true;
  if (priorAnchor) await repository.setAnchor({ type: 'bodyMass', anchor: priorAnchor, backfillStartMs: now - 90 * day });
  let denied = true;
  let clock = now;
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => {
    if (type !== 'bodyMass') return fetch(type, input);
    // HealthKit hides denial but returns a current DB cursor that excludes the old sample.
    if (denied || input.anchor === 'A-now') return { samples: [], deletedUuids: [], anchor: 'A-now', hasMore: false };
    return { samples: input.anchor === priorAnchor ? [weight(1)] : [], deletedUuids: [], anchor: 'A-history', hasMore: false };
  };
  const sync = createHealthSync({ adapter, connection: db, now: () => clock });
  const deniedResult = await sync.sync('open');
  expect(deniedResult.types.find((row) => row.type === 'bodyMass')).toMatchObject({
    availability: { state: 'requested', readState: 'noReadableSamples', lastQueryAt: now, lastSampleAt: null }, errors: [],
  });
  denied = false;
  clock += day;
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
  expect((await repository.listAnchors('bodyMass')).rows[0]?.anchor).toBe('A-history');
  expect((await repository.listAvailability('bodyMass')).rows[0]).toMatchObject({
    state: 'requested', readState: 'hasSamples', lastQueryAt: now + day, lastSampleAt: now - day,
  });
});

test('a fresh record synced with reads off re-imports the full 90-day window after re-grant', async () => {
  adapter.authorizationRequested = true;
  const { value: _value, unit: _unit, type: _type, ...common } = weight(4);
  const history: HealthSampleDto[] = [
    weight(1, now - 90 * day - 1), weight(2, now - 90 * day), weight(3),
    { ...common, type: 'sleep', stage: 'asleepCore' },
    { ...weight(5), type: 'hrv', unit: 'ms' },
    { ...weight(6), type: 'restingHeartRate', unit: 'bpm' },
    { ...common, uuid: uuid(7), type: 'workout', activityType: 50 },
  ];
  history.forEach((sample) => adapter.addSample(sample));
  let denied = true;
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => {
    const page = await fetch(type, input);
    return denied ? { ...page, samples: [], deletedUuids: [], hasMore: false } : page;
  };
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  expect((await repository.listAnchors()).rows).toEqual([]);
  await sync.sync('open');
  expect((await repository.listSamples()).rows).toEqual([]);
  expect((await repository.listAnchors()).rows).toEqual(healthSignalTypes.map((type) => ({
    type, anchor: null, backfillStartMs: now - 90 * day,
  })).sort((a, b) => a.type.localeCompare(b.type)));
  denied = false;
  await sync.sync('refresh');
  expect((await repository.listSamples()).rows.map((sample) => sample.uuid).sort()).toEqual([
    uuid(2), uuid(3), uuid(4), uuid(5), uuid(6), uuid(7),
  ]);
});

test('a populated type retains its real anchor while off and imports samples added during that period', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  let denied = false;
  let clock = now;
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => {
    const page = await fetch(type, input);
    return denied && type === 'bodyMass' ? { ...page, samples: [], deletedUuids: [], hasMore: false } : page;
  };
  const sync = createHealthSync({ adapter, connection: db, now: () => clock });
  await sync.sync('open');
  denied = true;
  // An unrelated type advances HealthKit's global database position.
  adapter.addSample({ ...weight(2), type: 'hrv', unit: 'ms' });
  clock += day;
  await sync.sync('refresh');
  expect((await repository.listAvailability('bodyMass')).rows[0]).toMatchObject({
    state: 'requested', readState: 'hasSamples', lastQueryAt: now + day, lastSampleAt: now - day,
  });
  adapter.addSample(weight(3, now));
  await sync.sync('refresh');
  denied = false;
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1), uuid(3)]);
  expect((await repository.listAnchors('bodyMass')).rows[0]?.anchor).toBe('fake:bodyMass:3');
});

test('empty pages can continue pagination in memory without advancing the stored anchor', async () => {
  adapter.authorizationRequested = true;
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => {
    if (type !== 'bodyMass') return fetch(type, input);
    return input.anchor === null
      ? { samples: [], deletedUuids: [], anchor: 'A-filtered', hasMore: true }
      : { samples: [], deletedUuids: [], anchor: 'A-now', hasMore: false };
  };
  const result = await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  expect(result.types.find((row) => row.type === 'bodyMass')).toMatchObject({
    addedCount: 0, skippedCount: 0, availability: { readState: 'noReadableSamples', lastQueryAt: now }, errors: [],
  });
  expect((await repository.listAnchors('bodyMass')).rows[0]).toEqual({ type: 'bodyMass', anchor: null, backfillStartMs: now - 90 * day });
});

test('anchored additions, edits and Health deletions preserve stable IDs and remove cached rows', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  adapter.addSample(weight(2));
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const before = (await repository.listSamples('bodyMass')).rows.find((sample) => sample.uuid === uuid(1))!;
  adapter.editSample({ ...weight(1), value: 81 });
  adapter.deleteSample('bodyMass', uuid(2));
  adapter.addSample(weight(3));
  await sync.sync('refresh');
  const rows = (await repository.listSamples('bodyMass')).rows;
  expect(rows).toHaveLength(2);
  expect(rows.find((sample) => sample.uuid === uuid(1))).toMatchObject({ id: before.id, value: 81 });
  expect(rows.some((sample) => sample.uuid === uuid(2))).toBe(false);
  expect((await repository.listSamples('bodyMass', { from: now - 2 * day, to: now })).rows).toEqual(rows);
});

test('availability moves from notRequested through empty, populated and queryError without inferring read denial', async () => {
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  expect((await repository.listAvailability()).rows).toHaveLength(5);
  expect((await repository.listAvailability()).rows.every((row) => row.state === 'notRequested' && row.lastQueryAt === null)).toBe(true);
  await sync.connect();
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toEqual({
    type: 'bodyMass', state: 'requested', readState: 'noReadableSamples', lastQueryAt: now, lastSampleAt: null,
  });
  adapter.addSample(weight(1));
  await sync.sync('refresh');
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toMatchObject({ state: 'requested', readState: 'hasSamples', lastSampleAt: now - day });
  adapter.queryFailures.bodyMass = true;
  const result = await sync.sync('refresh');
  expect(result.types.find((row) => row.type === 'bodyMass')?.errors).toContainEqual({ kind: 'queryFailed', type: 'bodyMass' });
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toMatchObject({ state: 'requested', readState: 'queryError', lastSampleAt: now - day });
  expect((await repository.listSamples('bodyMass')).rows).toHaveLength(1);
  adapter.queryFailures.bodyMass = false;
  adapter.deleteSample('bodyMass', uuid(1));
  await sync.sync('refresh');
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toMatchObject({ readState: 'noReadableSamples', lastSampleAt: null });
  expect((await repository.listAnchors('bodyMass')).rows[0]?.anchor).toBe('fake:bodyMass:2');
  expect((await repository.listAnchors()).rows.map((row) => row.type).sort()).toEqual([...healthSignalTypes].sort());
});

test.each(['requested', 'notRequested', 'unavailableOnDevice', 'absent'] as const)('requestStatus failure preserves %s rather than inventing a request state', async (state) => {
  adapter.authorizationRequested = true;
  const previous = state === 'absent' ? null : state === 'requested'
    ? { type: 'bodyMass' as const, state, readState: 'hasSamples' as const, lastQueryAt: now - day, lastSampleAt: now - 2 * day }
    : { type: 'bodyMass' as const, state, readState: null, lastQueryAt: now - day, lastSampleAt: now - 2 * day };
  if (previous) await repository.setAvailability(previous);
  const requestStatus = adapter.requestStatus.bind(adapter);
  adapter.requestStatus = async (type) => {
    if (type === 'bodyMass') throw new Error('private status failure');
    return requestStatus(type);
  };
  const result = await createHealthSync({ adapter, connection: db, now: () => now }).sync('refresh');
  const expected = previous?.state === 'requested' ? { ...previous, readState: 'queryError', lastQueryAt: now } : previous;
  expect(result.types.find((row) => row.type === 'bodyMass')).toMatchObject({
    availability: expected, errors: [{ kind: 'queryFailed', type: 'bodyMass' }],
  });
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass') ?? null).toEqual(expected);
  expect((await repository.listAnchors()).rows.some((row) => row.type === 'bodyMass')).toBe(false);
  expect(result.types.filter((row) => row.type !== 'bodyMass').every((row) => row.availability?.state === 'requested' && !row.errors.length)).toBe(true);
});

test('malformed and wrong-type samples are skipped and counted while valid page samples commit', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  adapter.injectRawSample('bodyMass', { ...weight(2), unit: 'lb' });
  adapter.injectRawSample('bodyMass', { ...weight(3), type: 'hrv', unit: 'ms' });
  adapter.injectRawSample('bodyMass', { ...weight(4), source: null });
  const result = await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  expect((await repository.listSamples()).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
  expect(result.types.find((row) => row.type === 'bodyMass')).toMatchObject({
    addedCount: 1, skippedCount: 3, errors: [{ kind: 'validationSkipped', type: 'bodyMass', count: 3 }],
  });
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')?.anchor).not.toBeNull();
  expect(logged).toHaveBeenCalledWith('rows_skipped', { count: 3 });
});

test('an invalid-only page advances its anchor so later syncs do not re-fetch the bad rows', async () => {
  adapter.authorizationRequested = true;
  adapter.injectRawSample('bodyMass', { ...weight(1), unit: 'lb' });
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  const first = await sync.sync('open');
  expect(first.types.find((row) => row.type === 'bodyMass')).toMatchObject({
    addedCount: 0, skippedCount: 1, errors: [{ kind: 'validationSkipped', type: 'bodyMass', count: 1 }],
  });
  expect((await repository.listSamples('bodyMass')).rows).toEqual([]);
  expect((await repository.listAnchors('bodyMass')).rows[0]?.anchor).toBe('fake:bodyMass:1');
  const next = await sync.sync('refresh');
  expect(next.types.find((row) => row.type === 'bodyMass')).toMatchObject({ addedCount: 0, skippedCount: 0, errors: [] });
});

test('a failed page rolls back its adds, deletes and anchor, while another type still commits', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const before = (await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass');
  adapter.deleteSample('bodyMass', uuid(1));
  adapter.addSample(weight(2));
  adapter.addSample(weight(3));
  adapter.addSample({ ...weight(4), type: 'hrv', unit: 'ms' });
  const failing: SqlExecutor = { ...db, transaction: (work) => db.transaction((tx) => work({ ...tx,
    run: async (sql, params) => {
      if (sql.includes('INSERT INTO health_sample') && params?.includes(uuid(3))) throw new Error('private disk failure');
      await tx.run(sql, params);
    },
  })) };
  const result = await createHealthSync({ adapter, connection: failing, now: () => now }).sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')).toEqual(before);
  expect((await repository.listSamples('hrv')).rows.map((sample) => sample.uuid)).toEqual([uuid(4)]);
  expect(result.types.find((row) => row.type === 'bodyMass')?.errors).toContainEqual({ kind: 'queryFailed', type: 'bodyMass' });
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid).sort()).toEqual([uuid(2), uuid(3)]);
});

test('an availability-write failure retains the persisted state and does not abandon the remaining types', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  let clock = now;
  const sync = createHealthSync({ adapter, connection: db, now: () => clock });
  await sync.sync('open');
  const previous = (await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass');
  await db.run(`CREATE TRIGGER fail_body_availability BEFORE INSERT ON signal_availability
    WHEN NEW.type = 'bodyMass' BEGIN SELECT RAISE(ABORT, 'private disk failure'); END`);
  adapter.requestStatuses.bodyMass = 'shouldRequest';
  adapter.addSample({ ...weight(2), type: 'hrv', unit: 'ms' });
  clock += day;
  const result = await sync.sync('refresh');
  expect(result.error).toBeUndefined();
  expect(result.types).toHaveLength(5);
  expect(result.types.find((row) => row.type === 'bodyMass')).toMatchObject({
    availability: previous, errors: [{ kind: 'queryFailed', type: 'bodyMass' }],
  });
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toEqual(previous);
  expect((await repository.listSamples('hrv')).rows.map((sample) => sample.uuid)).toEqual([uuid(2)]);
  expect(result.types.filter((row) => row.type !== 'bodyMass').every((row) => row.availability?.state === 'requested' && !row.errors.length)).toBe(true);
});

test.each(['isAvailable', 'requestReadAuthorization'] as const)('%s failure reports an overall error without fabricating per-type availability', async (operation) => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const previous = await repository.listAvailability();
  adapter[operation] = async () => { throw new Error('private native failure'); };
  const result = operation === 'isAvailable' ? await sync.sync('refresh') : await sync.connect();
  expect(result).toMatchObject({ error: { kind: 'queryFailed' }, types: [] });
  expect(await repository.listAvailability()).toEqual(previous);
});

test('a first-query failure still fixes the backfill bound at that first attempt', async () => {
  adapter.authorizationRequested = true;
  adapter.queryFailures.bodyMass = true;
  let clock = now;
  const sync = createHealthSync({ adapter, connection: db, now: () => clock });
  await sync.sync('open');
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')).toEqual({ type: 'bodyMass', anchor: null, backfillStartMs: Date.parse('2026-08-10T12:00:00Z') });
  adapter.queryFailures.bodyMass = false;
  clock += 10 * day;
  adapter.addSample(weight(1, now - 89 * day));
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows).toHaveLength(1);
});

test('concurrent open and refresh requests share one run and one result', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  adapter.isAvailable = async () => { await gate; return true; };
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  const opened = sync.sync('open');
  const refreshed = sync.sync('refresh');
  expect(refreshed).toBe(opened);
  release();
  expect(await refreshed).toBe(await opened);
  expect((await repository.listSamples('bodyMass')).rows).toHaveLength(1);
});

test('stopIngestion drains an in-flight native fetch, discards its page and refuses future syncs', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  let entered!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => { entered(); await gate; return fetch(type, input); };
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  const pending = sync.sync('open');
  await started;
  let drained = false;
  const stopping = sync.stopIngestion().then(() => { drained = true; });
  await Promise.resolve();
  expect(drained).toBe(false);
  release();
  await stopping;
  expect(await pending).toMatchObject({ error: { kind: 'stopped' } });
  expect((await repository.listSamples()).rows).toEqual([]);
  expect(await sync.sync('refresh')).toMatchObject({ error: { kind: 'stopped' } });
  expect(await sync.connect()).toMatchObject({ error: { kind: 'stopped' } });
});

test.each(['erasing', 'erase-blocked'] as const)('sync and repository writes are refused while the record is %s', async (phase) => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  useRecordLifecycle.setState({ phase });
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  expect(await sync.sync('open')).toMatchObject({ error: { kind: 'writesBlocked' } });
  await expect(repository.upsertSamples([weight(2)])).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  expect((await repository.listSamples()).rows).toEqual([]);
  expect((await repository.listAnchors()).rows).toEqual([]);
});

test('refreshOnOpenAttempted resolves after an unsuccessful open attempt, including unexpected adapter failure', async () => {
  adapter.isAvailable = async () => { throw new Error('private native failure'); };
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  const pending = sync.sync('open');
  const attempted = sync.refreshOnOpenAttempted();
  let finished = false;
  void attempted.then(() => { finished = true; });
  await Promise.resolve();
  expect(finished).toBe(false);
  const result = await pending;
  expect(result).toMatchObject({ types: [], error: { kind: 'queryFailed' } });
  await expect(attempted).resolves.toBeUndefined();
});

test('refreshOnOpenAttempted resolves immediately when no open attempt has started', async () => {
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  let finished = false;
  void sync.refreshOnOpenAttempted().then(() => { finished = true; });
  await Promise.resolve();
  expect(finished).toBe(true);
});

test.each([false, true])('refreshOnOpenAttempted waits for a second open with deferred fetch (query fails: %s)', async (fails) => {
  adapter.authorizationRequested = true;
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  await sync.refreshOnOpenAttempted();
  let entered!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => { entered(); await gate; return fetch(type, input); };
  adapter.queryFailures.bodyMass = fails;
  const pending = sync.sync('open');
  let finished = false;
  const attempted = sync.refreshOnOpenAttempted().then(() => { finished = true; });
  await started;
  try {
    expect(finished).toBe(false);
  } finally {
    release();
    await pending;
  }
  await attempted;
  expect(finished).toBe(true);
});

test('post-commit events identify changed types and subscribers can read their committed rows', async () => {
  adapter.authorizationRequested = true;
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const events: string[][] = [];
  const reads: Promise<unknown>[] = [];
  const unsubscribe = sync.onCommitted((types) => {
    events.push([...types]);
    reads.push(repository.listSamples());
  });
  adapter.addSample(weight(1));
  adapter.addSample({ ...weight(2), type: 'hrv', unit: 'ms' });
  await sync.sync('refresh');
  expect([...new Set(events.flat())].sort()).toEqual(['bodyMass', 'hrv']);
  expect((await Promise.all(reads)).every((result) => (result as { rows: unknown[] }).rows.length > 0)).toBe(true);
  unsubscribe();
  events.length = 0;
  adapter.deleteSample('bodyMass', uuid(1));
  await sync.sync('refresh');
  expect(events).toEqual([]);
});

test('deleteHistory purges only its type, resets its anchor, emits a commit and permits the next backfill to re-import', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  adapter.addSample({ ...weight(2), type: 'hrv', unit: 'ms' });
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const events: string[][] = [];
  sync.onCommitted((types) => { events.push([...types]); });
  expect(await sync.deleteHistory('bodyMass')).toEqual({ ok: true });
  expect((await repository.listSamples('bodyMass')).rows).toEqual([]);
  expect((await repository.listSamples('hrv')).rows).toHaveLength(1);
  expect((await repository.listAnchors()).rows.some((row) => row.type === 'bodyMass')).toBe(false);
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toMatchObject({ readState: 'noReadableSamples', lastSampleAt: null });
  expect(events).toEqual([['bodyMass']]);
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
});

test('deleting a signal history while reads are off keeps its reset anchor until re-grant re-imports it', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  let denied = false;
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => {
    const page = await fetch(type, input);
    return denied && type === 'bodyMass' ? { ...page, samples: [], deletedUuids: [], hasMore: false } : page;
  };
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  denied = true;
  expect(await sync.deleteHistory('bodyMass')).toEqual({ ok: true });
  await sync.sync('refresh');
  expect((await repository.listAnchors('bodyMass')).rows[0]?.anchor).toBeNull();
  denied = false;
  await sync.sync('refresh');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
});

test('stopIngestion also drains authorization in flight and connect failures return typed results', async () => {
  adapter.requestReadAuthorization = async () => { throw new Error('private authorization failure'); };
  const failed = createHealthSync({ adapter, connection: db, now: () => now });
  await expect(failed.connect()).resolves.toMatchObject({ types: [], error: { kind: 'queryFailed' } });
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { entered = resolve; });
  adapter.requestReadAuthorization = async () => { entered(); await gate; adapter.authorizationRequested = true; };
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  const pending = sync.connect();
  await started;
  let drained = false;
  const stopping = sync.stopIngestion().then(() => { drained = true; });
  await Promise.resolve();
  expect(drained).toBe(false);
  release();
  await stopping;
  expect(await pending).toMatchObject({ error: { kind: 'stopped' } });
});

test('health export includes stable samples, full provenance, observable availability and opaque anchors in canonical units', async () => {
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-330);
  adapter.authorizationRequested = true;
  adapter.addSample({ ...weight(1), userEntered: true, device: { model: 'Scale', name: 'Private device', manufacturer: 'Maker', hardwareVersion: 'A', softwareVersion: '2' } });
  adapter.addSample({ ...weight(2), type: 'hrv', value: 50, unit: 'ms' });
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const local = (await repository.listSamples('bodyMass')).rows[0];
  const exported = await db.transaction((tx) => healthSignalsExportSection.read(tx));
  expect(healthSignalsExportSection).toMatchObject({ key: 'healthSignals', version: 1, owner: 'health', tables: ['health_sample', 'signal_availability', 'health_sync_anchor'] });
  expect(exported.skippedCount).toBe(0);
  expect(exported.records).toContainEqual(expect.objectContaining({ kind: 'sample', id: local.id, uuid: uuid(1),
    startAt: '2026-11-07T17:30:00.000+05:30', endAt: '2026-11-07T17:30:00.000+05:30',
    value: 80, unit: 'kg', source: { bundleId: 'test.scale', name: 'Scale' }, sourceRevision: local.sourceRevision, device: local.device, userEntered: true,
  }));
  expect(exported.records).toContainEqual(expect.objectContaining({ kind: 'sample', type: 'hrv', value: 0.05, unit: 's' }));
  expect(exported.records).toContainEqual({ kind: 'availability', type: 'bodyMass', state: 'requested', readState: 'hasSamples',
    lastQueryAt: '2026-11-08T17:30:00.000+05:30', lastSampleAt: '2026-11-07T17:30:00.000+05:30' });
  expect(exported.records).toContainEqual(expect.objectContaining({ kind: 'anchor', type: 'bodyMass', anchor: 'fake:bodyMass:2', backfillStartAt: '2026-08-10T17:30:00.000+05:30' }));
  await sync.deleteHistory('bodyMass');
  const purged = await db.transaction((tx) => healthSignalsExportSection.read(tx));
  expect(purged.records.some((record) => (record as { kind: string; type: string }).kind === 'sample' && (record as { type: string }).type === 'bodyMass')).toBe(false);
  expect(JSON.stringify(logged.mock.calls)).not.toContain('Private device');
});

test('the health erase participant stops the registered singleton and verifies its in-memory reset without native imports', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  setActiveHealthSync(sync);
  sync.onCommitted(() => {});
  expect(await healthEraseParticipant.isClear()).toBe(false);
  await sync.sync('open');
  await healthEraseParticipant.quiesce();
  expect(await sync.sync('refresh')).toMatchObject({ error: { kind: 'stopped' } });
  await healthEraseParticipant.reset();
  expect(await healthEraseParticipant.isClear()).toBe(true);
  expect(sync.isClear()).toBe(true);
});

test('a later page failure retains the earlier committed page, anchor and last sample time', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  adapter.addSample(weight(2, now));
  const failing: SqlExecutor = { ...db, transaction: (work) => db.transaction((tx) => work({ ...tx,
    run: async (sql, params) => {
      if (sql.includes('INSERT INTO health_sample') && params?.includes(uuid(2))) throw new Error('disk full');
      await tx.run(sql, params);
    },
  })) };
  const sync = createHealthSync({ adapter, connection: failing, now: () => now, pageLimit: 1 });
  const events: string[][] = [];
  sync.onCommitted((types) => { events.push([...types]); });
  await sync.sync('open');
  expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')?.anchor).toBe('fake:bodyMass:1');
  expect((await repository.listAvailability()).rows.find((row) => row.type === 'bodyMass')).toMatchObject({ readState: 'queryError', lastSampleAt: now - day });
  expect(events.flat()).toContain('bodyMass');
});

test('unknown and shouldRequest authorization statuses never fetch or create an anchor', async () => {
  adapter.authorizationRequested = true;
  adapter.requestStatuses.bodyMass = 'unknown';
  adapter.requestStatuses.hrv = 'shouldRequest';
  adapter.addSample(weight(1));
  adapter.addSample({ ...weight(2), type: 'hrv', unit: 'ms' });
  const result = await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  for (const type of ['bodyMass', 'hrv'] as const) {
    expect(result.types.find((row) => row.type === type)).toMatchObject({ availability: { state: 'notRequested' }, errors: [] });
    expect((await repository.listAnchors()).rows.some((row) => row.type === type)).toBe(false);
  }
  expect((await repository.listSamples()).rows).toEqual([]);
});

test('persisted sample, availability and anchor corruption is skipped, counted and retained on repeated public reads and export', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  // Corruption injection only; assertions read through the repository/serializer, never SQL side channels.
  await db.run('UPDATE health_sample SET source_name = ? WHERE hk_uuid = ?', ['', uuid(1)]);
  await db.run('UPDATE signal_availability SET last_query_at = ? WHERE type = ?', ['corrupt', 'bodyMass']);
  await db.run('UPDATE health_sync_anchor SET backfill_start_ms = ? WHERE type = ?', ['corrupt', 'bodyMass']);
  for (let read = 0; read < 2; read++) {
    expect(await repository.listSamples()).toEqual({ rows: [], skippedCount: 1 });
    expect((await repository.listAvailability()).skippedCount).toBe(1);
    expect((await repository.listAnchors()).skippedCount).toBe(1);
  }
  expect((await db.transaction((tx) => healthSignalsExportSection.read(tx))).skippedCount).toBe(3);
});

test.each(['availability', 'anchor'] as const)('refresh refuses a corrupt %s row without replacing it, while other types sync', async (corrupt) => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  if (corrupt === 'availability') {
    await db.run('UPDATE signal_availability SET last_query_at = ? WHERE type = ?', ['corrupt', 'bodyMass']);
  } else {
    await db.run('UPDATE health_sync_anchor SET backfill_start_ms = ? WHERE type = ?', ['corrupt', 'bodyMass']);
  }
  adapter.addSample(weight(2));
  adapter.addSample({ ...weight(3), type: 'hrv', unit: 'ms' });
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await sync.sync('refresh');
    expect((await repository.listAvailability()).skippedCount).toBe(corrupt === 'availability' ? 1 : 0);
    expect((await repository.listAnchors()).skippedCount).toBe(corrupt === 'anchor' ? 1 : 0);
    expect(result.types.find((row) => row.type === 'bodyMass')).toMatchObject({
      addedCount: 0, skippedCount: 1, errors: expect.arrayContaining([{ kind: 'invalidStoredData', type: 'bodyMass' }]),
    });
    expect((await repository.listSamples('bodyMass')).rows.map((sample) => sample.uuid)).toEqual([uuid(1)]);
    expect((await repository.listSamples('hrv')).rows.map((sample) => sample.uuid)).toEqual([uuid(3)]);
    expect((await db.transaction((tx) => healthSignalsExportSection.read(tx))).skippedCount).toBe(1);
  }
});

test('a blocked lifecycle while a native fetch is pending discards its page and leaves its cursor unadvanced', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight(1));
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => {
    const result = await fetch(type, input);
    useRecordLifecycle.setState({ phase: 'erasing' });
    return result;
  };
  const result = await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  expect(result).toMatchObject({ error: { kind: 'writesBlocked' } });
  expect((await repository.listSamples()).rows).toEqual([]);
  expect((await repository.listAnchors()).rows.find((row) => row.type === 'bodyMass')?.anchor).toBeNull();
});
