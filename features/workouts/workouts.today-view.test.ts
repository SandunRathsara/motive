import { buildTodayTraining } from './workouts.today-view';
import { entry, session, squat } from './workouts.test-kit';

describe('Today', () => {
  const fullBody = { id: 'full-body', name: 'Full Body', exercises: [squat] };
  test('Start the next template, or Resume the active session', () => {
    expect(buildTodayTraining({ active: null, next: fullBody })).toMatchObject({
      action: 'start', buttonLabel: 'Start', title: 'Full Body', detail: 'Next in your rotation', templateId: 'full-body', accessibilityLabel: 'Start Full Body',
    });
    const active = { ...session(), sets: [entry('a', squat, 0, 80, 8), entry('b', squat, 1, 80, 8)] };
    expect(buildTodayTraining({ active, next: fullBody })).toMatchObject({
      action: 'resume', buttonLabel: 'Resume', sessionId: 's-now', detail: '2 sets logged', accessibilityLabel: 'Resume Full Body',
    });
    expect(buildTodayTraining({ active: { ...session(), sets: [] }, next: null }).detail).toBe('In progress');
  });

  test('with no template there is nothing to start', () => {
    expect(buildTodayTraining({ active: null, next: null })).toMatchObject({ action: 'none' });
  });
});
