import { migrations } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createWorkoutRepository, inWorkoutTransaction } from './workout-repository';
import type { ProgressionCacheEntry, SetEntry, WorkoutSession } from '../workouts.schemas';

const databases: SqlExecutor[] = [];
async function database() {
  const db = nodeExecutor(); databases.push(db);
  await db.exec('PRAGMA foreign_keys = ON');
  await migrateRecord(db, async () => {}, migrations);
  return db;
}
afterEach(async () => {
  useRecordLifecycle.setState({ phase: 'ready' });
  await Promise.all(databases.splice(0).map((db) => db.close()));
});

const exercise = { id: 'te1', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 8, max: 10 }, incrementKg: 2.5 };
const session = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1', templateId: 't1', startedAt: 1_000, endedAt: null, completed: false, deload: false,
  prescription: { templateName: 'Push', exercises: [exercise, { ...exercise, id: 'te2', exerciseId: 'push-up', restOverrideSeconds: 60 }] },
  ...over,
});
const set = (over: Partial<SetEntry> = {}): SetEntry => ({
  id: 'a', sessionId: 's1', templateExerciseId: 'te1', exerciseId: 'bench-press', index: 0, type: 'working',
  loadKg: 80, reps: 9, committedAt: 1_100, editedAt: null, ...over,
});

test('a started session round-trips with its prescription snapshot and is the single active session', async () => {
  const repo = createWorkoutRepository(await database());
  await repo.insertSession(session());
  expect(await repo.getSession('s1')).toEqual(session());
  expect(await repo.findActiveSession()).toEqual(session());
  expect(await repo.getSession('nope')).toBeNull();
  await expect(repo.insertSession(session({ id: 's2', startedAt: 2_000 }))).rejects.toMatchObject({ name: 'WorkoutsError', code: 'activeSessionExists' });
});

test('finishing a session ends it, marks completion and frees the active slot', async () => {
  const repo = createWorkoutRepository(await database());
  await repo.insertSession(session());
  expect(await repo.updateSession('s1', { endedAt: 5_000, completed: true })).toEqual(session({ endedAt: 5_000, completed: true }));
  expect(await repo.findActiveSession()).toBeNull();
  await repo.insertSession(session({ id: 's2', startedAt: 6_000 }));
  await expect(repo.updateSession('missing', { completed: true })).rejects.toMatchObject({ code: 'notFound' });
  await expect(repo.updateSession('s2', { endedAt: 1 })).rejects.toMatchObject({ code: 'invalidState' });
});

test('sessions list newest first by default and filter by template, status and start window', async () => {
  const repo = createWorkoutRepository(await database());
  await repo.insertSession(session({ id: 's1', templateId: 't1', startedAt: 1_000, endedAt: 2_000, completed: true }));
  await repo.insertSession(session({ id: 's2', templateId: 't2', startedAt: 3_000, endedAt: 4_000, completed: false }));
  await repo.insertSession(session({ id: 's3', templateId: 't1', startedAt: 5_000 }));
  const ids = async (filter?: Parameters<typeof repo.listSessions>[0]) => (await repo.listSessions(filter)).rows.map((row) => row.id);
  expect(await ids()).toEqual(['s3', 's2', 's1']);
  expect(await ids({ order: 'asc' })).toEqual(['s1', 's2', 's3']);
  expect(await ids({ templateId: 't1' })).toEqual(['s3', 's1']);
  expect(await ids({ status: 'finished' })).toEqual(['s2', 's1']);
  expect(await ids({ status: 'active' })).toEqual(['s3']);
  expect(await ids({ startedFromMs: 3_000, startedBeforeMs: 5_000 })).toEqual(['s2']);
});

test('set entries commit, filter, edit and delete', async () => {
  const repo = createWorkoutRepository(await database());
  await repo.insertSession(session());
  await repo.insertSet(set());
  await repo.insertSet(set({ id: 'b', index: 1, committedAt: 1_200, reps: 10 }));
  await repo.insertSet(set({ id: 'c', templateExerciseId: 'te2', exerciseId: 'push-up', loadKg: null, reps: 12, committedAt: 1_300 }));
  await repo.insertSet(set({ id: 'w', index: 0, type: 'warmup', loadKg: 40, committedAt: 1_050 }));
  const ids = async (filter?: Parameters<typeof repo.listSets>[0]) => (await repo.listSets(filter)).rows.map((row) => row.id);
  expect(await ids()).toEqual(['w', 'a', 'b', 'c']);
  expect(await ids({ sessionId: 's1', templateExerciseId: 'te2' })).toEqual(['c']);
  expect(await ids({ exerciseId: 'bench-press' })).toEqual(['w', 'a', 'b']);
  expect(await ids({ sessionIds: ['s1'] })).toEqual(['w', 'a', 'b', 'c']);
  expect(await ids({ sessionIds: [] })).toEqual([]);
  expect(await ids({ committedFromMs: 1_100, committedBeforeMs: 1_300 })).toEqual(['a', 'b']);
  expect(await repo.getSet('c')).toEqual(set({ id: 'c', templateExerciseId: 'te2', exerciseId: 'push-up', loadKg: null, reps: 12, committedAt: 1_300 }));
  expect(await repo.updateSet('a', { loadKg: 82.5, reps: 8, type: 'warmup', editedAt: 9_000 })).toEqual(set({ loadKg: 82.5, reps: 8, type: 'warmup', editedAt: 9_000 }));
  await expect(repo.updateSet('nope', { reps: 3 })).rejects.toMatchObject({ code: 'notFound' });
  await expect(repo.updateSet('a', { reps: 0 })).rejects.toMatchObject({ code: 'invalidState' });
  expect(await repo.deleteSet('b')).toBe(true);
  expect(await repo.deleteSet('b')).toBe(false);
  expect(await ids({ sessionId: 's1' })).toEqual(['w', 'a', 'c']);
});

test('a set for an unknown session or with invalid values is a typed error and writes nothing', async () => {
  const repo = createWorkoutRepository(await database());
  await expect(repo.insertSet(set())).rejects.toMatchObject({ code: 'notFound' });
  await repo.insertSession(session());
  await expect(repo.insertSet(set({ reps: 0 }))).rejects.toMatchObject({ code: 'invalidState' });
  await expect(repo.insertSet(set({ loadKg: -5 }))).rejects.toMatchObject({ code: 'invalidState' });
  expect((await repo.listSets()).rows).toEqual([]);
});

test('deleting a session removes its sets and nothing else', async () => {
  const repo = createWorkoutRepository(await database());
  await repo.insertSession(session({ id: 's1', endedAt: 2_000, completed: true }));
  await repo.insertSession(session({ id: 's2', startedAt: 3_000 }));
  await repo.insertSet(set());
  await repo.insertSet(set({ id: 'x', sessionId: 's2' }));
  expect(await repo.deleteSession('s1')).toBe(true);
  expect(await repo.deleteSession('s1')).toBe(false);
  expect((await repo.listSets()).rows.map((row) => row.id)).toEqual(['x']);
  expect((await repo.listSessions()).rows.map((row) => row.id)).toEqual(['s2']);
});

test('progression cache upserts one entry per Template Exercise and can be cleared', async () => {
  const repo = createWorkoutRepository(await database());
  const entry: ProgressionCacheEntry = {
    templateExerciseId: 'te1', recommendedSets: [{ index: 0, loadKg: 82.5, reps: 8 }, { index: 1, loadKg: 82.5, reps: 8 }],
    stallCounters: { sessionsAtLoad: 2 }, sourceSessionIds: ['s1', 's2'], updatedAt: 7_000,
  };
  expect(await repo.getProgression('te1')).toBeNull();
  await repo.putProgression(entry);
  await repo.putProgression({ ...entry, templateExerciseId: 'te2', recommendedSets: [], stallCounters: {}, sourceSessionIds: [] });
  expect(await repo.getProgression('te1')).toEqual(entry);
  await repo.putProgression({ ...entry, stallCounters: { sessionsAtLoad: 3 }, updatedAt: 8_000 });
  expect(await repo.getProgression('te1')).toEqual({ ...entry, stallCounters: { sessionsAtLoad: 3 }, updatedAt: 8_000 });
  expect((await repo.listProgression()).rows.map((row) => row.templateExerciseId)).toEqual(['te1', 'te2']);
  await repo.deleteProgression('te1');
  expect(await repo.getProgression('te1')).toBeNull();
  await repo.clearProgression();
  expect((await repo.listProgression()).rows).toEqual([]);
});

test('invalid stored rows are skipped in lists and surface as invalidRows when read directly', async () => {
  const db = await database();
  const repo = createWorkoutRepository(db);
  await repo.insertSession(session());
  await db.run("INSERT INTO workout_session VALUES ('bad', 't1', 10, 20, 1, 0, 'not json')");
  await repo.insertSet(set());
  await db.run("INSERT INTO set_entry VALUES ('badset', 's1', 'te1', 'bench-press', 0, 'working', 80, 9, 1, NULL), ('badset2', 's1', 'te1', 'bench-press', 0, 'working', 80, 9, 1, NULL)");
  await db.run("UPDATE set_entry SET exercise_id = '' WHERE id = 'badset2'");
  const sessions = await repo.listSessions();
  expect(sessions.rows.map((row) => row.id)).toEqual(['s1']);
  expect(sessions.skippedCount).toBe(1);
  await expect(repo.getSession('bad')).rejects.toMatchObject({ code: 'invalidRows' });
  expect((await repo.listSets()).skippedCount).toBe(1);
});

test('storage failures are typed and expose no SQL or paths', async () => {
  const db = await database();
  const repo = createWorkoutRepository(db);
  await db.close();
  await expect(repo.listSessions()).rejects.toMatchObject({ name: 'WorkoutsError', code: 'readFailed', message: 'readFailed' });
  await expect(repo.insertSession(session())).rejects.toMatchObject({ name: 'WorkoutsError', code: 'writeFailed', message: 'writeFailed' });
});

test('writes are refused while the record lifecycle blocks them, reads still work', async () => {
  const repo = createWorkoutRepository(await database());
  await repo.insertSession(session());
  useRecordLifecycle.setState({ phase: 'erasing' });
  await expect(repo.insertSet(set())).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  await expect(repo.deleteSession('s1')).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  await expect(repo.putProgression({ templateExerciseId: 'te1', recommendedSets: [], stallCounters: {}, sourceSessionIds: [], updatedAt: 1 })).rejects.toMatchObject({ code: 'recordWritesBlocked' });
  expect((await repo.listSessions()).rows).toHaveLength(1);
});

test('a transaction commits every write together or rolls all of them back', async () => {
  const db = await database();
  await inWorkoutTransaction(async (repo) => {
    await repo.insertSession(session());
    await repo.insertSet(set());
  }, db);
  await expect(inWorkoutTransaction(async (repo) => {
    await repo.insertSet(set({ id: 'z', index: 1 }));
    await repo.updateSession('s1', { endedAt: 9_000, completed: true });
    throw new Error('boom');
  }, db)).rejects.toMatchObject({ name: 'WorkoutsError', code: 'writeFailed' });
  const repo = createWorkoutRepository(db);
  expect((await repo.listSets()).rows.map((row) => row.id)).toEqual(['a']);
  expect(await repo.findActiveSession()).toEqual(session());
  await expect(inWorkoutTransaction(async (inner) => {
    await inner.insertSession(session({ id: 's9', endedAt: 5, completed: true, startedAt: 2 }));
    await inner.insertSession(session({ id: 's10', startedAt: 3 }));
  }, db)).rejects.toMatchObject({ code: 'activeSessionExists' });
  expect((await repo.listSessions()).rows.map((row) => row.id)).toEqual(['s1']);
});
