import { requireRecord, type SqlExecutor } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { getDailyWeights, getTrendWeight, getLatestKnownTrendWeight, getHealthWorkouts, getHealthCoachingContext, getHealthEvidenceContext } from '../index';
import { FakeHealthKitAdapter } from './fake-healthkit';
import { createHealthSync } from './health-sync';

jest.mock('@/lib/persistence', () => ({ ...jest.requireActual('@/lib/persistence'), requireRecord: jest.fn() }));
const now = Date.parse('2026-11-08T12:00:00Z');
const context = { now, utcOffsetMinutes: () => 0 };
let db: SqlExecutor;
let adapter: FakeHealthKitAdapter;
beforeEach(async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  useRecordLifecycle.setState({ phase: 'ready' });
  db = nodeExecutor();
  await migrateRecord(db, async () => {});
  jest.mocked(requireRecord).mockReturnValue(db);
  adapter = new FakeHealthKitAdapter();
  adapter.authorizationRequested = true;
});

test('Evidence Snapshot context freezes aggregate-only values with the explicit no-decision-authority label', async () => {
  adapter.addSample({ uuid: '00000000-0000-4000-8000-000000000001', type: 'restingHeartRate', value: 60, unit: 'bpm',
    startMs: now - 3_600_000, endMs: now - 3_600_000, source: { bundleId: 'watch', name: 'Private Watch' },
    sourceRevision: {}, device: null, userEntered: false });
  const sync = createHealthSync({ adapter, connection: db, now: () => now });
  await sync.sync('open');
  const snapshot = await getHealthEvidenceContext(context);
  expect(snapshot).toMatchObject({ label: 'not used in the decision', restingHeartRate: {
    last7: { known: true, value: 60, coverage: { known: 1, of: 7, unit: 'days' } },
    baseline: { known: false, reason: 'insufficientCoverage', coverage: { known: 0, of: 28, unit: 'days' } },
  } });
  await sync.deleteHistory('restingHeartRate');
  expect((await getHealthEvidenceContext(context)).restingHeartRate.last7.known).toBe(false);
  expect(snapshot.restingHeartRate.last7).toMatchObject({ known: true, value: 60 });
  expect(JSON.stringify(snapshot)).not.toMatch(/Private|provenance|sampleId|uuid/);
});

test('Coaching Context has exactly 28 device-local daily aggregates and no sample IDs, source names or devices', async () => {
  adapter.addSample({ uuid: '00000000-0000-4000-8000-000000000001', type: 'hrv', value: 40, unit: 'ms',
    startMs: now - 3_600_000, endMs: now - 3_600_000, source: { bundleId: 'private.bundle', name: 'Private Watch' },
    sourceRevision: {}, device: { model: 'Watch', name: 'Private device' }, userEntered: false });
  await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  const result = await getHealthCoachingContext(context);
  expect(result.days).toHaveLength(28);
  expect(result.days[0]).toMatchObject({ day: '2026-10-12', weight: { known: false, coverage: { known: 0, of: 1, unit: 'days' } } });
  expect(result.days[27]).toMatchObject({ day: '2026-11-08', hrv: { value: { known: true, value: 40, coverage: { known: 1, of: 1, unit: 'days' } }, baseline: { known: false } } });
  expect(JSON.stringify(result)).not.toMatch(/00000000|private|Private|provenance|sampleId|device|bundleId/);
});

test('public Health workouts use inclusive interval overlap and explicit known/unknown coverage', async () => {
  adapter.addSample({ uuid: '00000000-0000-4000-8000-000000000001', type: 'workout', activityType: 50,
    startMs: now - 3_600_000, endMs: now, source: { bundleId: 'watch', name: 'Watch' }, sourceRevision: {}, device: null, userEntered: false });
  await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  expect(await getHealthWorkouts({ from: now, to: now }, context)).toMatchObject({ known: true,
    value: [{ id: expect.any(String), activityType: 50, startMs: now - 3_600_000, endMs: now }], coverage: { known: 1, of: 1, unit: 'days' } });
  expect(await getHealthWorkouts({ from: now + 1, to: now + 1 }, context)).toMatchObject({ known: false, reason: 'noSamples', coverage: { known: 0, of: 1, unit: 'days' } });
});
afterEach(async () => { await db.close(); jest.restoreAllMocks(); });

test('public daily weights keep selected stable sample IDs and gaps', async () => {
  for (const [index, at, value] of [[1, '2026-11-02T06:00:00Z', 80], [2, '2026-11-02T08:00:00Z', 99], [3, '2026-11-08T06:00:00Z', 84]] as const) {
    adapter.addSample({ uuid: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, type: 'bodyMass',
      startMs: Date.parse(at), endMs: Date.parse(at), value, unit: 'kg', source: { bundleId: 'scale', name: 'Scale' },
      sourceRevision: {}, device: null, userEntered: true });
  }
  await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  const daily = await getDailyWeights({ startDay: '2026-11-02', endDay: '2026-11-08' }, context);
  expect(daily.days[0]).toMatchObject({ known: true, value: 80, provenance: [{ sampleId: expect.stringMatching(/^[0-9a-f-]{36}$/) }] });
  expect(daily.days[1]).toMatchObject({ known: false, reason: 'noSamples' });
  expect(daily.coverage).toEqual({ known: 2, of: 7, unit: 'days' });
  expect(await getTrendWeight('2026-11-08', context)).toMatchObject({ known: true, value: 82, coverage: { known: 2, of: 7, unit: 'days' } });
  expect(await getTrendWeight('2026-11-03', context)).toMatchObject({ known: true, value: 80, coverage: { known: 1, of: 7, unit: 'days' } });
});

test('public Trend Weight stays unknown without weigh-ins and supports a requested historical day', async () => {
  expect(await getLatestKnownTrendWeight(context)).toEqual({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  expect(await getTrendWeight('2026-11-02', context)).toEqual({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  adapter.addSample({ uuid: '00000000-0000-4000-8000-000000000001', type: 'bodyMass', value: 81, unit: 'kg',
    startMs: Date.parse('2026-11-01T06:00:00Z'), endMs: Date.parse('2026-11-01T06:00:00Z'), source: { bundleId: 'scale', name: 'Scale' },
    sourceRevision: {}, device: null, userEntered: false });
  await createHealthSync({ adapter, connection: db, now: () => now }).sync('open');
  expect(await getTrendWeight('2026-11-02', context)).toMatchObject({ known: true, value: 81, coverage: { known: 1, of: 7, unit: 'days' } });
  expect(await getTrendWeight('2026-11-08', context)).toMatchObject({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  expect(await getLatestKnownTrendWeight(context)).toMatchObject({ known: true, value: 81, coverage: { known: 1, of: 7, unit: 'days' } });
});
