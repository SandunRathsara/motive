import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createWorkoutRepository } from './workout-repository';
import { createWorkoutService, type WorkoutService } from './workout-service';
import { counterIds, day, fakeClock, minute, openTestRecord, utcOffset } from './service-test-kit';

jest.mock('@/features/health', () => ({ getHealthWorkouts: jest.fn() }));
jest.mock('@/lib/logger');

const squat = 'full-body-back-squat';
let db: SqlExecutor;
let clock: ReturnType<typeof fakeClock>;
let recorded: { event_type: string; duration_ms?: number }[];
let svc: WorkoutService;
const make = (extra: Parameters<typeof createWorkoutService>[0] = {}) => createWorkoutService({
  connection: db, now: clock.now, newId: counterIds(), offsetAt: utcOffset, healthWorkouts: async () => [],
  recordMetric: async (event) => { recorded.push(event); }, ...extra,
});
beforeEach(async () => { db = await openTestRecord(); clock = fakeClock(); recorded = []; svc = make(); });
afterEach(async () => { await db.close(); useRecordLifecycle.setState({ phase: 'ready' }); });

/** Starts, logs `squat` sets as [load, reps] pairs, finishes, then moves a day on. */
async function squatSession(sets: [number, number][]) {
  const session = await svc.startSession('full-body');
  const logged = [];
  for (const [loadKg, reps] of sets) {
    clock.advance(minute);
    logged.push((await svc.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg, reps, durationMs: 1000 })).set);
  }
  clock.advance(minute);
  const finished = await svc.finishSession(session.id);
  clock.advance(day);
  return { session: finished, sets: logged };
}
const cached = async () => (await createWorkoutRepository(db).getProgression(squat))?.recommendedSets.map(({ loadKg, reps }) => [loadKg, reps]);

describe('finish', () => {
  test('ends the session, completes it when it has a working set, and fills the progression cache', async () => {
    const { session } = await squatSession([[80, 8], [80, 8], [80, 8]]);
    expect(session).toMatchObject({ completed: true });
    expect(session.endedAt).not.toBeNull();
    expect(await cached()).toEqual([[80, 9], [80, 9], [80, 9]]);
    const stored = await createWorkoutRepository(db).getProgression(squat);
    expect(stored?.sourceSessionIds).toEqual([session.id]);
  });

  test('a session with only warmups finishes but is not completed', async () => {
    const session = await svc.startSession('full-body');
    await svc.logSet({ sessionId: session.id, templateExerciseId: squat, type: 'warmup', loadKg: 40, reps: 10, durationMs: 1 });
    expect(await svc.finishSession(session.id)).toMatchObject({ completed: false });
  });

  test('every prescribed set at the top of the range adds one increment and resets reps to the bottom', async () => {
    await squatSession([[80, 10], [80, 10], [80, 10]]);
    expect(await cached()).toEqual([[82.5, 6], [82.5, 6], [82.5, 6]]);
  });

  test('cannot finish twice; a failed commit leaves the session active and the cache untouched', async () => {
    const session = await svc.startSession('full-body');
    await svc.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1 });
    await expect(make({ beforeCommit: async () => { throw new Error('boom'); } }).finishSession(session.id)).rejects.toMatchObject({ code: 'writeFailed' });
    expect((await createWorkoutRepository(db).getSession(session.id))?.endedAt).toBeNull();
    expect(await cached()).toBeUndefined();
    await svc.finishSession(session.id);
    await expect(svc.finishSession(session.id)).rejects.toMatchObject({ code: 'invalidState' });
  });
});

describe('editing and deleting past sessions recomputes immediately (TRN-9)', () => {
  test('editing a past set changes the next Recommended Set and records a distinct edit event', async () => {
    const { sets } = await squatSession([[80, 8], [80, 8], [80, 8]]);
    expect(await cached()).toEqual([[80, 9], [80, 9], [80, 9]]);
    await svc.editSet({ setId: sets[0].id, reps: 10, durationMs: 4000 });
    expect(await cached()).toEqual([[80, 10], [80, 9], [80, 9]]);
    expect((await createWorkoutRepository(db).getSet(sets[0].id))?.editedAt).toBe(clock.now());
    expect(recorded.at(-1)).toEqual({ event_type: 'set_edit', duration_ms: 4000 });
    expect(recorded.filter((event) => event.event_type === 'set_logging')).toHaveLength(3);
  });

  test('retyping the only working sets to warmup un-completes the session and clears the recommendation', async () => {
    const { session, sets } = await squatSession([[80, 8]]);
    await svc.editSet({ setId: sets[0].id, type: 'warmup' });
    expect((await createWorkoutRepository(db).getSession(session.id))?.completed).toBe(false);
    expect(await cached()).toEqual([]);
  });

  test('deleting a past set reindexes the rest and recomputes; undo restores it in place', async () => {
    const { sets } = await squatSession([[80, 8], [80, 9], [80, 10]]);
    const { undo } = await svc.deleteSet(sets[1].id);
    const repository = createWorkoutRepository(db);
    expect((await repository.listSets()).rows.map((set) => [set.index, set.reps])).toEqual([[0, 8], [1, 10]]);
    await svc.undo(undo);
    expect((await repository.listSets()).rows.map((set) => [set.id === sets[1].id, set.index, set.reps]).sort()).toEqual(
      [[false, 0, 8], [false, 2, 10], [true, 1, 9]].sort());
    expect(await cached()).toEqual([[80, 9], [80, 10], [80, 10]]);
  });

  test('deleting a session removes it and its sets and recomputes; undo restores both', async () => {
    const first = await squatSession([[80, 8], [80, 8], [80, 8]]);
    await squatSession([[80, 9], [80, 9], [80, 9]]);
    expect(await cached()).toEqual([[80, 10], [80, 10], [80, 10]]);
    const { undo } = await svc.deleteSession(first.session.id);
    const repository = createWorkoutRepository(db);
    expect((await repository.listSessions()).rows).toHaveLength(1);
    expect((await repository.listSets()).rows).toHaveLength(3);
    await svc.undo(undo);
    expect((await repository.listSessions()).rows).toHaveLength(2);
    expect((await repository.listSets()).rows).toHaveLength(6);
    expect(await cached()).toEqual([[80, 10], [80, 10], [80, 10]]);
  });

  test('deleting the only session clears the recommendation', async () => {
    const { session } = await squatSession([[80, 8]]);
    await svc.deleteSession(session.id);
    expect(await cached()).toEqual([]);
  });

  test('undo of a logged set removes it, and undoing twice is harmless', async () => {
    const session = await svc.startSession('full-body');
    const { undo } = await svc.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 1 });
    await svc.undo(undo);
    await svc.undo(undo);
    expect((await createWorkoutRepository(db).listSets()).rows).toHaveLength(0);
  });

  test('adding a set to a finished session is an edit after save and can complete it', async () => {
    const session = await svc.startSession('full-body');
    await svc.finishSession(session.id);
    expect((await createWorkoutRepository(db).getSession(session.id))?.completed).toBe(false);
    await svc.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg: 80, reps: 8, durationMs: 2000 });
    expect((await createWorkoutRepository(db).getSession(session.id))?.completed).toBe(true);
    expect(recorded).toEqual([{ event_type: 'set_edit', duration_ms: 2000 }]);
  });
});

describe('an active session keeps its prescription but its chips follow edited history (D7)', () => {
  test('past edit refreshes unlogged recommended sets in the active session', async () => {
    const { sets } = await squatSession([[80, 8], [80, 8], [80, 8]]);
    const active = await svc.startSession('full-body');
    const before = await svc.readSession(active.id);
    expect(before.exercises[0].progression.recommendedSets?.map((set) => set.reps)).toEqual([9, 9, 9]);
    await svc.editSet({ setId: sets[2].id, reps: 10 });
    const after = await svc.readSession(active.id);
    expect(after.exercises[0].progression.recommendedSets?.map((set) => set.reps)).toEqual([9, 9, 10]);
    expect(after.session.prescription).toEqual(before.session.prescription);
  });
});
