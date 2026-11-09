import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RecordStorage, SqlExecutor } from '@/lib/persistence';
import type { ExportSection } from '@/lib/contracts/export-section';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { exerciseLibrary, exerciseLibraryVersion } from '@/features/workouts';
import { completeOnboarding } from '@/features/onboarding';
import { createPlanStore } from '@/features/plan';
import { exportEnvelopeSchema } from '../data.schemas';
import { exportSections } from '../registry/export-sections';
import { createExportService } from './export';
import type { ShareAdapter } from './share';

const build = { variant: 'verification', version: '1.0.0', buildNumber: '2', buildId: '1.0.0+2', gitTag: 'build/verification/1.0.0+2' } as const;
const metricId = '11111111-1111-4111-8111-111111111111';
const emptyCounts = { gateMetrics: 0, healthSignals: 0, profile: 0, plan: 0, exerciseLibrary: 0, trainingLog: 0 };
const onboardingInput = {
  sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80,
  weightOrigin: { kind: 'health', sampleTime: Date.parse('2026-11-07T18:30:00Z'), sourceName: 'Scale' },
  goal: 'fatLoss', ratePreset: -0.5, weeklySessionTarget: 3,
} as const;
let root: string;
let db: SqlExecutor;
let storage: RecordStorage;
let share: jest.Mocked<ShareAdapter>;
let captured: unknown;
let logged: jest.SpyInstance;

function service(overrides: Partial<Parameters<typeof createExportService>[0]> = {}) {
  return createExportService({
    record: () => db, storage: async () => storage, share, sections: exportSections, build,
    now: () => Date.parse('2026-11-07T20:00:00Z'), lifecycle: useRecordLifecycle.getState,
    pauseAt: async () => {}, ...overrides,
  });
}

beforeEach(async () => {
  logged = jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-330);
  root = await mkdtemp(join(tmpdir(), 'motive-export-'));
  storage = {
    root,
    prepare: async () => { await mkdir(join(root, 'export-staging'), { recursive: true }); },
    exists: async (path) => { try { await access(path); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } },
    remove: (path) => rm(path, { recursive: true, force: true }),
    copy: copyFile, move: rename, readText: (path) => readFile(path, 'utf8'), writeText: (path, text) => writeFile(path, text),
  };
  await storage.prepare();
  db = nodeExecutor(join(root, 'record.sqlite'));
  expect(await migrateRecord(db, async () => {})).toBeNull();
  await db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', [metricId, 'set_logging', 1250, '1.0.0+1', Date.parse('2026-11-07T18:30:00Z')]);
  captured = undefined;
  share = { share: jest.fn(async ({ uri }) => { captured = JSON.parse(await readFile(uri, 'utf8')); return { ok: true } as const; }) };
  useRecordLifecycle.setState({ phase: 'ready' });
});

afterEach(async () => {
  await db.close();
  await rm(root, { recursive: true, force: true });
  useRecordLifecycle.setState({ phase: 'ready' });
  jest.restoreAllMocks();
});

test('shares one validated snapshot with canonical metrics and local-date filename, then removes staging', async () => {
  expect(await service().export()).toEqual({ ok: true, skippedCount: 0, skippedRowCounts: emptyCounts });
  expect(exportEnvelopeSchema.safeParse(captured).success).toBe(true);
  expect(captured).toEqual({
    format: 'motive-personal-health-record', formatVersion: 1, schemaVersion: 4,
    exportedAt: '2026-11-08T01:30:00.000+05:30', build,
    canonicalUnits: { bodyMass: 'kg', length: 'cm', foodMass: 'g', volume: 'ml', energy: 'kcal', duration: 's', timestamp: 'ISO-8601 with offset' },
    sections: { gateMetrics: { version: 1, owner: 'metrics', records: [{
      id: '11111111-1111-4111-8111-111111111111', eventType: 'set_logging', durationS: 1.25, build: '1.0.0+1', recordedAt: '2026-11-08T00:00:00.000+05:30',
    }] }, healthSignals: { version: 1, owner: 'health', records: [] },
    profile: { version: 1, owner: 'profile', records: [] }, plan: { version: 1, owner: 'plan', records: [] },
    exerciseLibrary: { version: 1, owner: 'workouts', records: exerciseLibrary.map((exercise) => ({ ...exercise, libraryVersion: exerciseLibraryVersion })).sort((a, b) => a.id.localeCompare(b.id)) },
    trainingLog: { version: 1, owner: 'workouts', records: [] } },
    skippedRowCounts: emptyCounts,
  });
  expect(share.share).toHaveBeenCalledWith({ uri: join(root, 'export-staging/motive-export-2026-11-08.json'), mimeType: 'application/json', uti: 'public.json', dialogTitle: 'Export Motive data' });
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
  expect(logged).toHaveBeenCalledWith('export_finished', { count: 31 });
});

test('the export describes Profile provenance, the starting estimate and version programs without a library lookup', async () => {
  const now = Date.parse('2026-11-07T19:00:00Z');
  const initial = await completeOnboarding(onboardingInput, { connection: db, now: () => now });
  const program = initial.version.snapshot.trainingProgram;
  await createPlanStore({ connection: db, now: () => now + 1000 }).appendVersion('Your edit', {
    trainingProgram: { rotation: [{ ...program.rotation[0], name: 'Full Body A' }] },
  });
  expect(await service().export()).toEqual({ ok: true, skippedCount: 0, skippedRowCounts: emptyCounts });
  const envelope = exportEnvelopeSchema.parse(captured);
  expect(envelope.formatVersion).toBe(1);
  expect(envelope.sections.profile).toEqual({ version: 1, owner: 'profile', records: [{
    sex: 'male', age: 30, heightCm: 180, activityLevel: 1.5, weightKg: 80,
    weightOrigin: { kind: 'health', sampleTime: '2026-11-08T00:00:00.000+05:30', sourceName: 'Scale' },
    createdAt: '2026-11-08T00:30:00.000+05:30',
  }] });
  const exercises = [
    { id: 'full-body-back-squat', exerciseId: 'back-squat', name: 'Back Squat', libraryVersion: 1, workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
    { exerciseId: 'bench-press', name: 'Bench Press', libraryVersion: 1 },
    { exerciseId: 'lat-pulldown', name: 'Lat Pulldown', libraryVersion: 1 },
    { exerciseId: 'romanian-deadlift', name: 'Romanian Deadlift', libraryVersion: 1 },
    { exerciseId: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', libraryVersion: 1 },
  ];
  const original = { rotation: [{ id: 'full-body', name: 'Full Body', exercises }] };
  const edited = { rotation: [{ id: 'full-body', name: 'Full Body A', exercises }] };
  expect(envelope.sections.plan).toMatchObject({ version: 1, owner: 'plan', records: [
    { kind: 'startingEstimate', valueKcal: 2670, createdAt: '2026-11-08T00:30:00.000+05:30' },
    { kind: 'planVersion', number: 2, source: 'Your edit', sourceRef: null, createdAt: '2026-11-08T00:30:01.000+05:30', snapshot: { trainingProgram: edited }, diff: { trainingProgram: { from: original, to: edited } } },
    { kind: 'planVersion', number: 1, source: 'Starting plan', sourceRef: null, snapshot: { kcalTarget: 2250, proteinFloorG: 144, trainingProgram: original }, diff: { trainingProgram: { from: null, to: original } } },
  ] });
  expect(envelope.sections.exerciseLibrary.records).toHaveLength(30);
  expect(envelope.sections.exerciseLibrary.records).toContainEqual({ id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false, libraryVersion: 1 });
});

test.each([
  ['ENOSPC: no space left on device', 'storageFull'],
  ['disk full', 'storageFull'],
  ['permission denied at a private path', 'writeFailed'],
])('a partial staging write failing with %s is removed and returns %s without raw detail', async (message, code) => {
  storage.writeText = async (path) => { await writeFile(path, 'partial'); throw new Error(message); };
  expect(await service().export()).toEqual({ ok: false, code });
  expect(share.share).not.toHaveBeenCalled();
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test('invalid stored rows remain on disk, but are skipped and counted in both file and outcome', async () => {
  await db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['not-a-uuid', 'set_logging', -1, 'old-build', 1]);
  expect(await service().export()).toEqual({ ok: true, skippedCount: 1, skippedRowCounts: { ...emptyCounts, gateMetrics: 1 } });
  expect(captured).toMatchObject({ skippedRowCounts: { gateMetrics: 1 }, sections: { gateMetrics: { records: [{ id: metricId }] } } });
  expect(await db.getFirst('SELECT count(*) AS count FROM gate_metric')).toEqual({ count: 2 });
});

test('invalid Profile, estimate, version and unreferenced library rows have exact owning-section counts', async () => {
  await completeOnboarding(onboardingInput, { connection: db });
  await db.exec("UPDATE profile SET weight_origin_json = 'not JSON'; UPDATE starting_estimate SET value_kcal = -1; UPDATE exercise_library SET name = '' WHERE id = 'leg-press';");
  await db.run('INSERT INTO plan_version VALUES (2, 1, ?, NULL, ?, ?)', ['Your edit', '{bad JSON', '{}']);
  await db.run('INSERT INTO plan_version VALUES (3, 2, ?, NULL, ?, ?)', ['Your edit', 'null', '{}']);
  const counts = { ...emptyCounts, profile: 1, plan: 3, exerciseLibrary: 1 };
  expect(await service().export()).toEqual({ ok: true, skippedCount: 5, skippedRowCounts: counts });
  const envelope = exportEnvelopeSchema.parse(captured);
  expect(envelope.skippedRowCounts).toEqual(counts);
  expect(envelope.sections.profile.records).toEqual([]);
  expect(envelope.sections.plan.records).toMatchObject([{ kind: 'planVersion', number: 1 }]);
  expect(envelope.sections.exerciseLibrary.records).toHaveLength(29);
  // A second export reports the same corruption: export never deletes invalid rows.
  expect(await service().export()).toEqual({ ok: true, skippedCount: 5, skippedRowCounts: counts });
});

test('unresolvable snapshot or old diff references skip each affected version once, not once per reference', async () => {
  const initial = await completeOnboarding(onboardingInput, { connection: db });
  const program = initial.version.snapshot.trainingProgram;
  const template = program.rotation[0];
  const store = createPlanStore({ connection: db });
  await store.appendVersion('Your edit', { trainingProgram: { rotation: [{ ...template, exercises: [
    { ...template.exercises[0], exerciseId: 'leg-press' }, ...template.exercises.slice(1),
  ] }] } });
  await store.appendVersion('Your edit', { proteinFloorG: 150 });
  await db.run("UPDATE exercise_library SET name = '' WHERE id = 'back-squat'");
  const counts = { ...emptyCounts, plan: 2, exerciseLibrary: 1 };
  expect(await service().export()).toEqual({ ok: true, skippedCount: 3, skippedRowCounts: counts });
  const envelope = exportEnvelopeSchema.parse(captured);
  expect(envelope.skippedRowCounts).toEqual(counts);
  expect(envelope.sections.plan.records).toMatchObject([
    { kind: 'startingEstimate', valueKcal: 2670 },
    { kind: 'planVersion', number: 3, snapshot: { trainingProgram: { rotation: [{ exercises: [
      { exerciseId: 'leg-press', name: 'Leg Press', libraryVersion: 1 }, {}, {}, {}, {},
    ] }] } } },
  ]);
});

test('exercise labels and library versions come from the same stored snapshot as the exported library', async () => {
  await completeOnboarding(onboardingInput, { connection: db });
  await db.run("UPDATE exercise_library SET name = ?, library_version = 2 WHERE id = 'back-squat'", ['Back Squat (revised label)']);
  expect((await service().export()).ok).toBe(true);
  const envelope = exportEnvelopeSchema.parse(captured);
  expect(envelope.sections.plan.records).toMatchObject([
    { kind: 'startingEstimate' },
    { kind: 'planVersion', snapshot: { trainingProgram: { rotation: [{ exercises: [
      { exerciseId: 'back-squat', name: 'Back Squat (revised label)', libraryVersion: 2 }, {}, {}, {}, {},
    ] }] } } },
  ]);
  expect(envelope.sections.exerciseLibrary.records).toContainEqual({ id: 'back-squat', name: 'Back Squat (revised label)', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false, libraryVersion: 2 });
});

test('section records keep their cross-section relationship IDs across repeated exports', async () => {
  await db.exec('CREATE TABLE parent (id TEXT PRIMARY KEY); CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent(id));');
  await db.run('INSERT INTO parent VALUES (?)', ['parent-1']);
  await db.run('INSERT INTO child VALUES (?, ?)', ['child-1', 'parent-1']);
  const sections: ExportSection[] = [
    { key: 'parents', owner: 'fixture', version: 1, tables: ['parent'], read: async (tx) => ({ records: await tx.getAll('SELECT id FROM parent'), skippedCount: 0 }) },
    { key: 'children', owner: 'fixture', version: 2, tables: ['child'], read: async (tx) => ({ records: await tx.getAll('SELECT id, parent_id AS parentId FROM child'), skippedCount: 0 }) },
  ];
  const exporter = service({ sections });
  for (let i = 0; i < 2; i++) {
    expect(await exporter.export()).toEqual({ ok: true, skippedCount: 0, skippedRowCounts: { parents: 0, children: 0 } });
    expect(captured).toMatchObject({ sections: {
      parents: { version: 1, records: [{ id: 'parent-1' }] },
      children: { version: 2, records: [{ id: 'child-1', parentId: 'parent-1' }] },
    } });
  }
});

test('all sections and schema version share one snapshot while a queued relationship update waits', async () => {
  let queuedWrite: Promise<void> | undefined;
  const sections: ExportSection[] = [
    { key: 'before', version: 1, owner: 'fixture', tables: ['gate_metric'], read: async (tx) => {
      const records = await tx.getAll('SELECT id, build FROM gate_metric');
      queuedWrite = db.exec("UPDATE gate_metric SET build = 'new-build'; PRAGMA user_version = 4;");
      return { records, skippedCount: 0 };
    } },
    { key: 'after', version: 1, owner: 'fixture', tables: ['gate_metric'], read: async (tx) => ({ records: await tx.getAll('SELECT id, build FROM gate_metric'), skippedCount: 0 }) },
  ];
  expect((await service({ sections }).export()).ok).toBe(true);
  await queuedWrite;
  expect(captured).toMatchObject({ schemaVersion: 4, sections: {
    before: { records: [{ id: '11111111-1111-4111-8111-111111111111', build: '1.0.0+1' }] },
    after: { records: [{ id: '11111111-1111-4111-8111-111111111111', build: '1.0.0+1' }] },
  } });
});

test.each(['sharingUnavailable', 'shareFailed'] as const)('a %s outcome removes staging and returns a typed failure', async (code) => {
  share.share.mockResolvedValue({ ok: false, code });
  expect(await service().export()).toEqual({ ok: false, code });
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test('invalid section output is not written or shared and leaves the record available', async () => {
  const sections: ExportSection[] = [{ key: 'invalid', version: 1, owner: 'fixture', tables: [], read: async () => ({ records: [{ value: undefined }], skippedCount: 0 }) }];
  expect(await service({ sections }).export()).toEqual({ ok: false, code: 'validationFailed' });
  expect(share.share).not.toHaveBeenCalled();
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test('cancelling before the share sheet removes staging and returns cancelled', async () => {
  const controller = new AbortController();
  const exporter = service({ pauseAt: async () => { controller.abort(); } });
  expect(await exporter.export(controller.signal)).toEqual({ ok: false, code: 'cancelled' });
  expect(share.share).not.toHaveBeenCalled();
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test('a new launch sweeps every leftover staged file, including partial writes', async () => {
  let staged!: () => void;
  const atStaging = new Promise<void>((resolve) => { staged = resolve; });
  // A verification interruption never resumes, like the old process after a force-quit.
  void service({ pauseAt: async () => { staged(); await new Promise<void>(() => {}); } }).export();
  await atStaging;
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(true);
  expect(share.share).not.toHaveBeenCalled();
  await writeFile(join(root, 'export-staging/partial.json'), '{');
  useRecordLifecycle.setState({ phase: 'ready' }); // New process, no in-memory operation.
  await service().sweepStaging();
  expect(await storage.exists(join(root, 'export-staging'))).toBe(false);
  expect(await storage.exists(join(root, 'record.sqlite'))).toBe(true);
  // openRecord.prepare recreates the directory before the next export.
  await storage.prepare();
  expect((await service().export()).ok).toBe(true);
});

test('a second operation is busy while the sheet is open; closing it by cancel still removes the file', async () => {
  let closeSheet!: () => void;
  let sheetOpened!: () => void;
  const opened = new Promise<void>((resolve) => { sheetOpened = resolve; });
  share.share.mockImplementation(() => new Promise((resolve) => { closeSheet = () => resolve({ ok: true }); sheetOpened(); }));
  const exporter = service();
  const pending = exporter.export();
  await opened;
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(true);
  expect(await service().export()).toEqual({ ok: false, code: 'busy' });
  expect(useRecordLifecycle.getState().phase).toBe('exporting');
  closeSheet();
  expect(await pending).toEqual({ ok: true, skippedCount: 0, skippedRowCounts: emptyCounts });
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test.each(['erasing', 'erase-blocked'] as const)('export refuses work during %s', async (phase) => {
  useRecordLifecycle.setState({ phase });
  expect(await service().export()).toEqual({ ok: false, code: 'busy' });
  expect(useRecordLifecycle.getState().phase).toBe(phase);
  expect(share.share).not.toHaveBeenCalled();
});

test('failed post-share cleanup returns a typed failure without claiming success; a later launch sweeps the residue', async () => {
  const remove = storage.remove;
  storage.remove = async () => {};
  expect(await service().export()).toEqual({ ok: false, code: 'cleanupFailed' });
  expect(share.share).toHaveBeenCalledTimes(1);
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(true);
  expect(logged).toHaveBeenCalledWith('export_failed', { errorCode: 'cleanupFailed' });
  expect(logged).not.toHaveBeenCalledWith('export_finished', expect.anything());
  expect(useRecordLifecycle.getState().phase).toBe('ready');
  storage.remove = remove;
  await service().sweepStaging();
  expect(await storage.exists(join(root, 'export-staging'))).toBe(false);
});

test('a sweep failure never escapes or changes the record lifecycle', async () => {
  const exporter = service({ storage: async () => { throw new Error('private device path'); } });
  await expect(exporter.sweepStaging()).resolves.toBeUndefined();
  expect(logged).toHaveBeenCalledWith('export_failed', { errorCode: 'stagingSweepFailed' });
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test.each(['removeThrows', 'remaining', 'inspectionThrows'] as const)('the launch sweep retries a transient %s once without blocking the record', async (failure) => {
  const path = join(root, 'export-staging');
  await writeFile(join(path, 'leftover.json'), 'private fixture');
  const remove = jest.spyOn(storage, 'remove');
  if (failure === 'removeThrows') remove.mockRejectedValueOnce(new Error('private path'));
  else if (failure === 'remaining') remove.mockResolvedValueOnce(undefined);
  else jest.spyOn(storage, 'exists').mockRejectedValueOnce(new Error('cannot verify a private path'));
  await expect(service().sweepStaging()).resolves.toBeUndefined();
  expect(remove).toHaveBeenCalledTimes(2);
  expect(await storage.exists(path)).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test('persistent staging residue is logged after two launch removal attempts without blocking the record', async () => {
  const path = join(root, 'export-staging');
  await writeFile(join(path, 'leftover.json'), 'private fixture');
  const remove = jest.spyOn(storage, 'remove').mockResolvedValue(undefined);
  await expect(service().sweepStaging()).resolves.toBeUndefined();
  expect(remove).toHaveBeenCalledTimes(2);
  expect(await storage.exists(path)).toBe(true);
  expect(logged).toHaveBeenCalledWith('export_failed', { errorCode: 'stagingSweepFailed' });
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test.each(['remove', 'exists'] as const)('a post-share cleanup %s exception returns cleanupFailed without exposing private details', async (method) => {
  jest.spyOn(storage, method).mockRejectedValue(new Error('private file path'));
  expect(await service().export()).toEqual({ ok: false, code: 'cleanupFailed' });
  expect(share.share).toHaveBeenCalledTimes(1);
  expect(logged).toHaveBeenCalledWith('export_failed', { errorCode: 'cleanupFailed' });
  expect(logged).not.toHaveBeenCalledWith('export_finished', expect.anything());
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});

test('duplicate section keys fail validation rather than silently overwriting records', async () => {
  expect(await service({ sections: [exportSections[0], exportSections[0]] }).export()).toEqual({ ok: false, code: 'validationFailed' });
  expect(share.share).not.toHaveBeenCalled();
});

test('metrics retain chronological then ID order and unclean exits have a null duration', async () => {
  await db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['22222222-2222-4222-8222-222222222222', 'unclean_exit', null, '1.0.0+2', 1]);
  await db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['00000000-0000-4000-8000-000000000000', 'recognition_wait', 400, '1.0.0+2', 1]);
  expect((await service().export()).ok).toBe(true);
  expect(captured).toMatchObject({ sections: { gateMetrics: { records: [
    { id: '00000000-0000-4000-8000-000000000000', eventType: 'recognition_wait', durationS: 0.4, recordedAt: '1970-01-01T05:30:00.001+05:30' },
    { id: '22222222-2222-4222-8222-222222222222', eventType: 'unclean_exit', durationS: null, recordedAt: '1970-01-01T05:30:00.001+05:30' },
    { id: '11111111-1111-4111-8111-111111111111', eventType: 'set_logging', durationS: 1.25, recordedAt: '2026-11-08T00:00:00.000+05:30' },
  ] } } });
});

test('an unexpected share exception is contained and staging is still removed', async () => {
  share.share.mockRejectedValue(new Error('private path and share provider details'));
  expect(await service().export()).toEqual({ ok: false, code: 'shareFailed' });
  expect(await storage.exists(join(root, 'export-staging/motive-export-2026-11-08.json'))).toBe(false);
  expect(useRecordLifecycle.getState().phase).toBe('ready');
});
