import type { HealthWorkout } from '@/features/health';
import type { SqlExecutor } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import type { TrainingProgram } from '../workouts.schemas';
import { createWorkoutService, type WorkoutService } from './workout-service';
import { counterIds, day, fakeClock, minute, openTestRecord, t0, utcOffset } from './service-test-kit';

jest.mock('@/features/health', () => ({ getHealthWorkouts: jest.fn() }));
jest.mock('@/lib/logger');

const program: TrainingProgram = { rotation: [
  { id: 'push', name: 'Push', exercises: [
    { id: 'push-bench', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
    { id: 'push-squat', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
  ] },
  { id: 'pull', name: 'Pull', exercises: [
    { id: 'pull-lat', exerciseId: 'lat-pulldown', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 5 },
    { id: 'pull-squat', exerciseId: 'back-squat', workingSets: 2, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
  ] },
] };

let db: SqlExecutor;
let clock: ReturnType<typeof fakeClock>;
let svc: WorkoutService;
let workouts: HealthWorkout[];
const workout = (id: string, startMs: number, endMs: number, activityType = 50): HealthWorkout => ({
  id, uuid: id, type: 'workout', startMs, endMs, activityType, source: { bundleId: 'x', name: 'Watch' }, sourceRevision: null, device: null, userEntered: false,
} as unknown as HealthWorkout);
beforeEach(async () => {
  db = await openTestRecord(program); clock = fakeClock(); workouts = [];
  svc = createWorkoutService({
    connection: db, now: clock.now, newId: counterIds(), offsetAt: utcOffset, recordMetric: async () => {},
    healthWorkouts: async (range) => workouts.filter((item) => item.endMs >= range.from && item.startMs <= range.to),
  });
});
afterEach(async () => { await db.close(); useRecordLifecycle.setState({ phase: 'ready' }); });

type Plan = Record<string, [number | null, number][]>;
/** Runs a whole session of `template` at `startAt`; each entry is a Template Exercise id → [load, reps][]. */
async function run(templateId: string, startAt: number, plan: Plan, lengthMin = 45) {
  clock.set(startAt);
  const session = await svc.startSession(templateId);
  for (const [templateExerciseId, sets] of Object.entries(plan)) {
    for (const [loadKg, reps] of sets) {
      clock.advance(minute);
      await svc.logSet({ sessionId: session.id, templateExerciseId, loadKg, reps, durationMs: 1 });
    }
  }
  clock.set(startAt + lengthMin * minute);
  return svc.finishSession(session.id);
}
const three = (load: number, reps: number): [number, number][] => [[load, reps], [load, reps], [load, reps]];

describe('overview (Train, Today)', () => {
  test('the rotation continues from the template actually done and counts this week', async () => {
    expect((await svc.readOverview(t0)).next?.id).toBe('push');
    await run('push', t0, { 'push-bench': three(60, 8) });
    const overview = await svc.readOverview(t0 + day);
    expect(overview).toMatchObject({ next: { id: 'pull' }, completedThisWeek: 1, weeklySessionTarget: 3, active: null });
    expect(overview.week.startDay).toBe('2026-11-09');
    expect(overview.sessions).toHaveLength(1);
  });

  test('an active session is reported for Resume, and does not count until finished', async () => {
    clock.set(t0);
    const active = await svc.startSession('push');
    const overview = await svc.readOverview(t0 + minute);
    expect(overview.active?.id).toBe(active.id);
    expect(overview.completedThisWeek).toBe(0);
  });

  test('a Health workout overlapping a session by at least half links; others are Other Activity (SIG-9)', async () => {
    const session = await run('push', t0, { 'push-bench': three(60, 8) }, 60);
    workouts = [workout('linked', t0 + 5 * minute, t0 + 65 * minute), workout('run', t0 + day, t0 + day + 30 * minute, 37)];
    const overview = await svc.readOverview(t0 + 2 * day);
    expect(overview.linking.links).toEqual([{ sessionId: session.id, workoutId: 'linked', overlapMs: 55 * minute }]);
    expect(overview.linking.otherActivity.map((item) => item.id)).toEqual(['run']);
  });
});

describe('session and summary reads', () => {
  test('summary carries volume, muscle-group sets, the comparison and the deterministic next-time line', async () => {
    await run('push', t0 - 7 * day, { 'push-bench': three(60, 8), 'push-squat': three(80, 8) });
    const session = await run('push', t0, { 'push-bench': three(60, 10), 'push-squat': [[80, 8], [80, 8], [80, 7]] });
    const { summary, comparison, nextTimeLine, previous } = await svc.readSummary(session.id);
    expect(summary).toMatchObject({ volumeKg: 60 * 10 * 3 + 80 * 8 * 2 + 80 * 7, workingSets: 6, bodyweightReps: 0 });
    expect(summary.setsByMuscleGroup).toEqual([{ muscleGroup: 'chest', sets: 3 }, { muscleGroup: 'quadriceps', sets: 3 }]);
    expect(previous).not.toBeNull();
    expect(comparison).toMatchObject({ previousVolumeKg: 60 * 8 * 3 + 80 * 8 * 3, workingSetsDelta: 0 });
    expect(nextTimeLine).toBe('Bench Press moves to 62.5 × 6; Back Squat repeats 80 kg');
  });

  test('after an exercise\'s first session the next-time line says where to start, not "repeats"', async () => {
    const session = await run('push', t0, { 'push-squat': [[80, 8], [80, 8], [80, 7]] });
    expect((await svc.readSummary(session.id)).nextTimeLine).toBe('Back Squat: start next time at 80 kg × 9');
  });

  test('readSession reports Recommended Sets and last sets per exercise from earlier finished sessions', async () => {
    await run('push', t0 - 7 * day, { 'push-bench': [[60, 8], [60, 9], [60, 7]] });
    clock.set(t0);
    const active = await svc.startSession('push');
    const { exercises } = await svc.readSession(active.id);
    const bench = exercises.find((entry) => entry.templateExercise.id === 'push-bench');
    expect(bench?.progression.recommendedSets).toEqual([{ loadKg: 60, reps: 9 }, { loadKg: 60, reps: 10 }, { loadKg: 60, reps: 8 }]);
    expect(bench?.progression.lastSets).toEqual([{ loadKg: 60, reps: 8 }, { loadKg: 60, reps: 9 }, { loadKg: 60, reps: 7 }]);
    const squat = exercises.find((entry) => entry.templateExercise.id === 'push-squat');
    expect(squat?.progression.recommendedSets).toBeNull();
  });

  test('an exercise progresses separately in each template, while its history combines both', async () => {
    await run('push', t0 - 14 * day, { 'push-squat': three(100, 10) });
    await run('pull', t0 - 7 * day, { 'pull-squat': [[60, 8], [60, 8]] });
    clock.set(t0);
    const active = await svc.startSession('pull');
    const { exercises } = await svc.readSession(active.id);
    expect(exercises.find((entry) => entry.templateExercise.id === 'pull-squat')?.progression.recommendedSets)
      .toEqual([{ loadKg: 60, reps: 9 }, { loadKg: 60, reps: 9 }]);
    const history = await svc.readExerciseHistory('back-squat');
    expect(history.map((entry) => entry.session.templateId)).toEqual(['pull', 'push']);
  });

  test('an unknown session is notFound', async () => {
    await expect(svc.readSession('nope')).rejects.toMatchObject({ code: 'notFound' });
    await expect(svc.readSummary('nope')).rejects.toMatchObject({ code: 'notFound' });
  });

  test('the linked Health workout is attached to the summary as context', async () => {
    const session = await run('push', t0, { 'push-bench': three(60, 8) }, 60);
    workouts = [workout('w1', t0, t0 + 55 * minute)];
    expect((await svc.readSummary(session.id)).linkedWorkout?.id).toBe('w1');
  });
});

describe('exposed to later slices', () => {
  test('closed-week completed counts run from the program\'s first week to last week, zeros included', async () => {
    // Plan v1 was created 30 days before t0: Saturday 10 Oct 2026, so the first week starts Monday 5 Oct.
    for (const at of [Date.UTC(2026, 9, 13, 10), Date.UTC(2026, 9, 15, 10), Date.UTC(2026, 9, 17, 10), Date.UTC(2026, 10, 3, 10)]) {
      await run('push', at, { 'push-bench': three(60, 8) });
    }
    await run('pull', Date.UTC(2026, 10, 9, 8), { 'pull-lat': three(40, 10) }); // current week: not closed
    expect(await svc.closedWeekCounts(t0)).toEqual([
      { weekStartDay: '2026-10-05', completed: 0 }, { weekStartDay: '2026-10-12', completed: 3 },
      { weekStartDay: '2026-10-19', completed: 0 }, { weekStartDay: '2026-10-26', completed: 0 },
      { weekStartDay: '2026-11-02', completed: 1 },
    ]);
  });

  test('stall history dates Stall events and counts non-Deload sessions per Template Exercise', async () => {
    const first = await run('push', t0 - 14 * day, { 'push-bench': three(100, 5) });
    const second = await run('push', t0 - 7 * day, { 'push-bench': three(100, 5) });
    const history = await svc.stallHistory();
    const bench = history.find((entry) => entry.templateExerciseId === 'push-bench');
    expect(bench).toMatchObject({ exerciseId: 'bench-press', sessionCount: 2, stalls: [{ sessionId: second.id, kind: 'failed-sets', at: second.endedAt }] });
    expect(first.endedAt).not.toBeNull();
    expect(history.find((entry) => entry.templateExerciseId === 'pull-lat')).toMatchObject({ sessionCount: 0, stalls: [] });
  });

  test('a Deload session is excluded from progression history', async () => {
    await run('push', t0 - 14 * day, { 'push-bench': three(100, 8) });
    clock.set(t0 - 7 * day);
    const deload = await svc.startSession('push', { deload: true });
    await svc.logSet({ sessionId: deload.id, templateExerciseId: 'push-bench', loadKg: 50, reps: 10, durationMs: 1 });
    await svc.finishSession(deload.id);
    clock.set(t0);
    const active = await svc.startSession('push');
    const bench = (await svc.readSession(active.id)).exercises.find((entry) => entry.templateExercise.id === 'push-bench');
    expect(bench?.progression.recommendedSets?.[0]).toEqual({ loadKg: 100, reps: 9 });
    expect(await svc.closedWeekCounts(t0)).toBeDefined();
  });

  test('last-seven-day aggregates cover sessions started in the window', async () => {
    await run('push', t0 - 10 * day, { 'push-bench': three(60, 8) });
    await run('push', t0 - 2 * day, { 'push-bench': three(60, 10) });
    await run('pull', t0 - day, { 'pull-lat': [[40, 10], [40, 10]] });
    const week = await svc.lastSevenDays(t0);
    expect(week).toMatchObject({ completedSessions: 2, workingSets: 5, volumeKg: 60 * 10 * 3 + 40 * 10 * 2 });
    expect(week.sessions.map((entry) => entry.templateName)).toEqual(['Push', 'Pull']);
    expect(week.setsByMuscleGroup).toEqual([{ muscleGroup: 'chest', sets: 3 }, { muscleGroup: 'back', sets: 2 }]);
  });
});
