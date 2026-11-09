import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createWorkoutRepository } from './workout-repository';
import { createWorkoutService } from './workout-service';
import { counterIds, fakeClock, minute, openTestRecord, t0, utcOffset } from './service-test-kit';

jest.mock('@/features/health', () => ({ getHealthWorkouts: jest.fn() }));
jest.mock('@/lib/logger');

const squat = 'full-body-back-squat';
const bench = 'full-body-bench-press';
let db: SqlExecutor;
let clock: ReturnType<typeof fakeClock>;
let recorded: unknown[];
function service(extra: Parameters<typeof createWorkoutService>[0] = {}) {
  return createWorkoutService({
    connection: db, now: clock.now, newId: counterIds(), offsetAt: utcOffset, healthWorkouts: async () => [],
    recordMetric: async (event) => { recorded.push(event); }, ...extra,
  });
}
beforeEach(async () => { db = await openTestRecord(); clock = fakeClock(); recorded = []; });
afterEach(async () => { await db.close(); useRecordLifecycle.setState({ phase: 'ready' }); });

describe('start', () => {
  test('freezes the template prescription into the session and marks it active', async () => {
    const session = await service().startSession('full-body');
    expect(session).toMatchObject({ templateId: 'full-body', startedAt: t0, endedAt: null, completed: false, deload: false });
    expect(session.prescription.templateName).toBe('Full Body');
    expect(session.prescription.exercises.map((exercise) => exercise.id)).toContain(squat);
    expect(await createWorkoutRepository(db).findActiveSession()).toEqual(session);
  });

  test('refuses a second active session and an unknown template', async () => {
    await service().startSession('full-body');
    await expect(service().startSession('full-body')).rejects.toMatchObject({ code: 'activeSessionExists' });
    await db.close();
    db = await openTestRecord();
    await expect(service().startSession('nope')).rejects.toMatchObject({ code: 'notFound' });
  });

  test('a Deload session keeps the exercises but halves working sets, rounded up', async () => {
    const session = await service().startSession('full-body', { deload: true });
    expect(session.deload).toBe(true);
    const sets = Object.fromEntries(session.prescription.exercises.map((exercise) => [exercise.id, exercise.workingSets]));
    expect(sets[squat]).toBe(2);
    expect(sets['full-body-dumbbell-shoulder-press']).toBe(1);
  });
});

describe('log set', () => {
  test('commits the set as given, indexed in order, and returns an undo token', async () => {
    const { startSession, logSet } = service();
    const session = await startSession('full-body');
    clock.advance(minute);
    const first = await logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1800 });
    clock.advance(minute);
    const second = await logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1500 });
    expect(first.set).toMatchObject({ exerciseId: 'back-squat', index: 0, type: 'working', loadKg: 80, reps: 8, committedAt: t0 + minute, editedAt: null });
    expect(second.set.index).toBe(1);
    expect(first.undo).toEqual({ kind: 'deleteSet', setId: first.set.id });
    expect((await createWorkoutRepository(db).listSets({ sessionId: session.id })).rows).toHaveLength(2);
  });

  test('records exactly one set-logging Gate Metric per commit, with only its duration', async () => {
    const { startSession, logSet } = service();
    const session = await startSession('full-body');
    await logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1800 });
    expect(recorded).toEqual([{ event_type: 'set_logging', duration_ms: 1800 }]);
  });

  test('a failed commit leaves nothing saved and records no metric (DATA-2)', async () => {
    const { startSession } = service();
    const session = await startSession('full-body');
    const failing = service({ beforeCommit: async () => { throw new Error('disk full'); } });
    await expect(failing.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 900 }))
      .rejects.toMatchObject({ code: 'writeFailed' });
    expect((await createWorkoutRepository(db).listSets()).rows).toHaveLength(0);
    expect(recorded).toEqual([]);
  });

  test('a metric failure never fails or undoes the committed set', async () => {
    const { startSession } = service();
    const session = await startSession('full-body');
    const flaky = service({ recordMetric: async () => { throw new Error('metrics down'); } });
    await expect(flaky.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1 })).resolves.toBeDefined();
    expect((await createWorkoutRepository(db).listSets()).rows).toHaveLength(1);
  });

  test('bodyweight exercises take reps only; loaded exercises need a load', async () => {
    await db.close();
    db = await openTestRecord({ rotation: [{ id: 'bw', name: 'Bodyweight', exercises: [
      { id: 'bw-pushup', exerciseId: 'push-up', workingSets: 3, repRange: { min: 8, max: 15 }, incrementKg: 0 },
      { id: 'bw-bench', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
    ] }] });
    const { startSession, logSet } = service();
    const session = await startSession('bw');
    await expect(logSet({ sessionId: session.id, templateExerciseId: 'bw-pushup', loadKg: 20, reps: 10, durationMs: 1 })).rejects.toMatchObject({ code: 'invalidState' });
    await expect(logSet({ sessionId: session.id, templateExerciseId: 'bw-bench', loadKg: null, reps: 10, durationMs: 1 })).rejects.toMatchObject({ code: 'invalidState' });
    const ok = await logSet({ sessionId: session.id, templateExerciseId: 'bw-pushup', loadKg: null, reps: 10, durationMs: 1 });
    expect(ok.set.loadKg).toBeNull();
  });

  test('refuses an exercise that is not in the session snapshot and an unknown session', async () => {
    const { startSession, logSet } = service();
    const session = await startSession('full-body');
    await expect(logSet({ sessionId: session.id, templateExerciseId: 'other', loadKg: 10, reps: 5, durationMs: 1 })).rejects.toMatchObject({ code: 'invalidState' });
    await expect(logSet({ sessionId: 'missing', templateExerciseId: squat, loadKg: 10, reps: 5, durationMs: 1 })).rejects.toMatchObject({ code: 'notFound' });
  });

  test('a warmup is stored as a warmup and the next working set still takes the next index', async () => {
    const { startSession, logSet } = service();
    const session = await startSession('full-body');
    const warmup = await logSet({ sessionId: session.id, templateExerciseId: bench, type: 'warmup', loadKg: 40, reps: 10, durationMs: 1 });
    const working = await logSet({ sessionId: session.id, templateExerciseId: bench, loadKg: 60, reps: 8, durationMs: 1 });
    expect([warmup.set.type, warmup.set.index, working.set.type, working.set.index]).toEqual(['warmup', 0, 'working', 1]);
  });
});

describe('Today read', () => {
  test('offers Start of the first template, then Resume of the active session with its sets', async () => {
    const { startSession, logSet, readToday } = service();
    expect(await readToday()).toMatchObject({ active: null, next: { id: 'full-body' } });
    const session = await startSession('full-body');
    await logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1 });
    const today = await readToday();
    expect(today.active?.id).toBe(session.id);
    expect(today.active?.sets).toHaveLength(1);
  });
});

describe('record lifecycle', () => {
  test('writes are refused with a typed error while the record is being erased, and nothing is saved', async () => {
    const { startSession, logSet } = service();
    const session = await startSession('full-body');
    useRecordLifecycle.setState({ phase: 'erasing' });
    await expect(logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1 })).rejects.toMatchObject({ code: 'recordWritesBlocked' });
    await expect(startSession('full-body')).rejects.toMatchObject({ code: 'recordWritesBlocked' });
    useRecordLifecycle.setState({ phase: 'ready' });
    expect((await createWorkoutRepository(db).listSets()).rows).toHaveLength(0);
    expect(recorded).toEqual([]);
  });
});
