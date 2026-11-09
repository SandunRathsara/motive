import { createPlanStore, planStore } from '@/features/plan';
import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { starterTrainingProgram } from '../workouts.content';
import type { TrainingProgram } from '../workouts.schemas';
import { createWorkoutRepository } from './workout-repository';
import { createWorkoutService, type WorkoutService } from './workout-service';
import { counterIds, day, fakeClock, minute, openTestRecord, t0, utcOffset } from './service-test-kit';

jest.mock('@/features/health', () => ({ getHealthWorkouts: jest.fn() }));
jest.mock('@/lib/logger');

const squat = 'full-body-back-squat';
let db: SqlExecutor;
let clock: ReturnType<typeof fakeClock>;
let svc: WorkoutService;
const make = (extra: Parameters<typeof createWorkoutService>[0] = {}) => createWorkoutService({
  connection: db, now: clock.now, newId: counterIds(), offsetAt: utcOffset, healthWorkouts: async () => [], recordMetric: async () => {}, ...extra,
});
beforeEach(async () => { db = await openTestRecord(); clock = fakeClock(); svc = make(); });
afterEach(async () => { await db.close(); planStore.clearChangeListeners(); useRecordLifecycle.setState({ phase: 'ready' }); });

const editExercise = (program: TrainingProgram, id: string, patch: Partial<TrainingProgram['rotation'][number]['exercises'][number]>): TrainingProgram => ({
  rotation: program.rotation.map((template) => ({ ...template, exercises: template.exercises.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise)) })),
});
const versions = async () => (await createPlanStore({ connection: db }).list()).rows;

async function squatSession(loads: [number, number][]) {
  const session = await svc.startSession('full-body');
  for (const [loadKg, reps] of loads) {
    clock.advance(minute);
    await svc.logSet({ sessionId: session.id, templateExerciseId: squat, loadKg, reps, durationMs: 1 });
  }
  clock.advance(minute);
  await svc.finishSession(session.id);
  clock.advance(day);
  return session;
}

test('one Save writes one Your edit Plan Version and leaves an active session unchanged (D5, PLAN-7)', async () => {
  const active = await svc.startSession('full-body');
  const edited = editExercise(starterTrainingProgram, squat, { workingSets: 4, repRange: { min: 5, max: 8 } });
  const result = await svc.saveProgram({ trainingProgram: edited, weeklySessionTarget: 4 });
  expect(result.changedFields.sort()).toEqual(['trainingProgram', 'weeklySessionTarget']);
  expect(result.version).toMatchObject({ number: 2, source: 'Your edit', sourceRef: null, snapshot: { weeklySessionTarget: 4, trainingProgram: edited } });
  expect(await versions()).toHaveLength(2);
  expect(await createWorkoutRepository(db).getSession(active.id)).toEqual(active);
  const next = await svc.startSession('full-body').catch((error: unknown) => error);
  expect(next).toMatchObject({ code: 'activeSessionExists' });
});

test('a Save with no change appends nothing', async () => {
  const result = await svc.saveProgram({ trainingProgram: starterTrainingProgram, weeklySessionTarget: 3 });
  expect(result).toEqual({ version: null, changedFields: [] });
  expect(await versions()).toHaveLength(1);
});

test('a failed Save writes no Plan Version and no progression change (DATA-2)', async () => {
  await squatSession([[80, 8], [80, 8], [80, 8]]);
  const failing = make({ beforeCommit: async () => { throw new Error('disk full'); } });
  await expect(failing.saveProgram({ weeklySessionTarget: 5 })).rejects.toMatchObject({ code: 'writeFailed' });
  expect(await versions()).toHaveLength(1);
});

test('an unknown exercise or out-of-range target is refused with a typed error', async () => {
  const unknown = editExercise(starterTrainingProgram, squat, { exerciseId: 'not-in-library' });
  await expect(svc.saveProgram({ trainingProgram: unknown })).rejects.toMatchObject({ code: 'invalidState' });
  await expect(svc.saveProgram({ weeklySessionTarget: 7 })).rejects.toMatchObject({ code: 'invalidState' });
  expect(await versions()).toHaveLength(1);
});

test('changing the rep range keeps the last load and moves reps to the new bottom (TRN-5)', async () => {
  await squatSession([[80, 8], [80, 8], [80, 8]]);
  await svc.saveProgram({ trainingProgram: editExercise(starterTrainingProgram, squat, { repRange: { min: 8, max: 12 } }) });
  const cache = await createWorkoutRepository(db).getProgression(squat);
  expect(cache?.recommendedSets.map(({ loadKg, reps }) => [loadKg, reps])).toEqual([[80, 8], [80, 8], [80, 8]]);
});

test('swapping the exercise gives the slot a new Template Exercise id with no history', async () => {
  await squatSession([[80, 8], [80, 8], [80, 8]]);
  const result = await svc.saveProgram({ trainingProgram: editExercise(starterTrainingProgram, squat, { exerciseId: 'leg-press' }) });
  const swapped = result.version?.snapshot.trainingProgram.rotation[0].exercises[0];
  expect(swapped?.exerciseId).toBe('leg-press');
  expect(swapped?.id).not.toBe(squat);
  const repository = createWorkoutRepository(db);
  expect(await repository.getProgression(squat)).toBeNull();
  expect((await repository.getProgression(swapped?.id ?? ''))?.recommendedSets).toEqual([]);
});

test('removing a template keeps its sessions and history (G10)', async () => {
  await squatSession([[80, 8], [80, 8], [80, 8]]);
  const other: TrainingProgram = { rotation: [{ id: 'upper', name: 'Upper', exercises: [
    { id: 'upper-bench', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
  ] }] };
  await svc.saveProgram({ trainingProgram: other });
  const repository = createWorkoutRepository(db);
  expect((await repository.listSessions()).rows).toHaveLength(1);
  expect((await repository.listSets()).rows).toHaveLength(3);
  expect(await repository.getProgression(squat)).toBeNull();
  expect((await svc.readExerciseHistory('back-squat'))).toHaveLength(1);
  expect((await svc.readOverview()).next?.id).toBe('upper');
});

test('the weekly-target-edited event fires for the user\'s target edit only (PLAN-3)', async () => {
  const events: unknown[] = [];
  const stop = svc.onWeeklyTargetEdited((event) => events.push(event));
  await svc.saveProgram({ trainingProgram: editExercise(starterTrainingProgram, squat, { incrementKg: 5 }) });
  expect(events).toEqual([]);
  await svc.saveProgram({ weeklySessionTarget: 5 });
  expect(events).toEqual([{ from: 3, to: 5, versionNumber: 3 }]);
  stop();
  await svc.saveProgram({ weeklySessionTarget: 2 });
  expect(events).toHaveLength(1);
});

test('the program creation date is Plan v1 and readProgram reflects the latest version', async () => {
  expect(await svc.programCreatedAt()).toBe(t0 - 30 * day);
  await svc.saveProgram({ weeklySessionTarget: 4 });
  expect(await svc.readProgram()).toMatchObject({ versionNumber: 2, state: { weeklySessionTarget: 4 } });
});
