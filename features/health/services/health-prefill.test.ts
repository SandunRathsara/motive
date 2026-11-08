import { requireRecord, type SqlExecutor } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { queryClient } from '@/lib/query/client';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createHealthSync, healthEraseParticipant, isHealthAvailableForPrefill, requestWeightForPrefill, setActiveHealthSync } from '../index';
import { FakeHealthKitAdapter } from './fake-healthkit';

jest.mock('@/lib/persistence', () => ({ ...jest.requireActual('@/lib/persistence'), requireRecord: jest.fn() }));
const now = Date.parse('2026-11-08T12:00:00Z');
let db: SqlExecutor;
let adapter: FakeHealthKitAdapter;
beforeEach(async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
  useRecordLifecycle.setState({ phase: 'ready' });
  db = nodeExecutor();
  await migrateRecord(db, async () => {});
  jest.mocked(requireRecord).mockReturnValue(db);
  adapter = new FakeHealthKitAdapter();
  setActiveHealthSync(createHealthSync({ adapter, connection: db, now: () => now }));
});

test('already requested body mass refreshes new samples without requesting authorization again', async () => {
  expect(await requestWeightForPrefill()).toMatchObject({ known: false, reason: 'noSamples' });
  adapter.addSample({ uuid: '00000000-0000-4000-8000-000000000001', type: 'bodyMass', value: 82, unit: 'kg',
    startMs: now - 3_600_000, endMs: now - 3_600_000, source: { bundleId: 'scale', name: 'Scale' },
    sourceRevision: {}, device: null, userEntered: false });
  const authorize = jest.spyOn(adapter, 'requestReadAuthorization');
  expect(await requestWeightForPrefill()).toMatchObject({ known: true, value: 82 });
  expect(authorize).not.toHaveBeenCalled();
});

test('unavailable Health returns no prefill and never requests authorization', async () => {
  adapter.available = false;
  expect(await isHealthAvailableForPrefill()).toBe(false);
  expect(await requestWeightForPrefill()).toBeNull();
  expect(adapter.authorizationRequested).toBe(false);
});

test('invalid stored availability refuses prefill without authorization or overwriting the invalid row', async () => {
  await db.run("INSERT INTO signal_availability VALUES ('bodyMass', 'requested', 'queryError', 1.5, NULL)");
  const authorize = jest.spyOn(adapter, 'requestReadAuthorization');
  await expect(requestWeightForPrefill()).rejects.toMatchObject({ kind: 'readFailed' });
  await expect(requestWeightForPrefill()).rejects.toMatchObject({ kind: 'readFailed' });
  expect(authorize).not.toHaveBeenCalled();
});
afterEach(async () => {
  await healthEraseParticipant.reset();
  queryClient.clear();
  await db.close();
  jest.restoreAllMocks();
});

test('prefill availability never authorizes; explicit opt-in authorizes and returns cached Trend Weight provenance', async () => {
  adapter.addSample({ uuid: '00000000-0000-4000-8000-000000000001', type: 'bodyMass', value: 80.5, unit: 'kg',
    startMs: now - 3_600_000, endMs: now - 3_600_000, source: { bundleId: 'scale', name: 'Scale' },
    sourceRevision: {}, device: null, userEntered: false });
  expect(await isHealthAvailableForPrefill()).toBe(true);
  expect(adapter.authorizationRequested).toBe(false);
  expect(await requestWeightForPrefill()).toMatchObject({ known: true, value: 80.5,
    provenance: [{ sampleTime: now - 3_600_000, source: { name: 'Scale' } }] });
  expect(adapter.authorizationRequested).toBe(true);
});
