import type { HealthWorkout } from '@/features/health';
import type { SetEntry, WorkoutSession } from './workouts.schemas';
import { buildTrainingWeek } from './workouts.train-view';
import { entry, pushUp, session, squat, t0, utc } from './workouts.test-kit';

describe('Train (S2)', () => {
  const finished = (id: string, startedAt: number, sets: SetEntry[], completed = true): WorkoutSession & { sets: SetEntry[] } => ({
    ...session({ id, startedAt, endedAt: startedAt + 45 * 60_000, completed }), sets: sets.map((set) => ({ ...set, sessionId: id })),
  });
  const workout = (id: string, startMs: number, durationMin: number, activityType: number) => ({ id, startMs, endMs: startMs + durationMin * 60_000, activityType }) as unknown as HealthWorkout;
  const fullBody = { id: 'full-body', name: 'Full Body', exercises: [squat, pushUp] };
  const upper = { id: 'upper', name: 'Upper', exercises: [squat] };

  test('weekly progress, templates, recent sessions and Other Activity', () => {
    const last = finished('s2', Date.UTC(2026, 10, 9, 8), [entry('a', squat, 0, 100, 10), entry('b', squat, 1, 100, 10)]);
    const old = finished('s1', Date.UTC(2026, 10, 2, 8), [], false);
    const linked = workout('w1', Date.UTC(2026, 10, 9, 8), 45, 50);
    const run = workout('w2', Date.UTC(2026, 10, 10, 7, 30), 30, 37);
    const content = buildTrainingWeek({
      now: t0, program: { rotation: [fullBody, upper] }, weeklySessionTarget: 3, completedThisWeek: 1, sessions: [last, old], active: null, next: upper,
      linking: { links: [{ sessionId: 's2', workoutId: 'w1' }], otherActivity: [run], workouts: [linked, run] },
    }, utc);
    expect(content).toMatchObject({ weekLabel: 'This week', completed: 1, target: 3, progressText: '1 of 3 sessions', targetMet: false, active: null, next: { templateId: 'upper', templateName: 'Upper' } });
    expect(content.progressFraction).toBeCloseTo(1 / 3);
    expect(content.templates).toEqual([
      { id: 'full-body', name: 'Full Body', summaryText: '2 exercises · 5 sets', lastDoneText: 'Last done Mon 9 Nov', isNext: false },
      { id: 'upper', name: 'Upper', summaryText: '1 exercise · 3 sets', lastDoneText: 'Not done yet', isNext: true },
    ]);
    expect(content.recentSessions).toEqual([
      { sessionId: 's2', templateName: 'Full Body', dateText: 'Mon 9 Nov', summaryText: '2 sets · 2,000 kg', statusText: 'Finished', counts: true, linkedWorkoutText: 'Linked: Traditional strength training · 45 min' },
      { sessionId: 's1', templateName: 'Full Body', dateText: 'Mon 2 Nov', summaryText: 'No working sets', statusText: 'Not counted', counts: false, linkedWorkoutText: null },
    ]);
    expect(content.otherActivity).toEqual([{ id: 'w2', title: 'Running', timeText: 'Tue 10 Nov, 07:30', durationText: '30 min' }]);
  });

  test('an active session is offered for Resume and the bar caps at the target', () => {
    const active = { ...session(), sets: [entry('a', squat, 0, 80, 8)] };
    const content = buildTrainingWeek({
      now: t0, program: { rotation: [fullBody] }, weeklySessionTarget: 1, completedThisWeek: 2, sessions: [active], active, next: fullBody,
      linking: { links: [], otherActivity: [], workouts: [] },
    }, utc);
    expect(content.active).toEqual({ sessionId: 's-now', templateName: 'Full Body', detail: '1 set logged' });
    expect(content).toMatchObject({ progressText: '2 of 1 session', progressFraction: 1, targetMet: true });
    expect(content.recentSessions[0]).toMatchObject({ statusText: 'In progress', counts: false });
  });
});
