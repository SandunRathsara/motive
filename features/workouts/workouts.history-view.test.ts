import { buildExerciseHistory } from './workouts.history-view';
import { entry, session, squat, utc } from './workouts.test-kit';

describe('Exercise history', () => {
  test('combines sessions across templates, newest first, with warmups kept apart', () => {
    const library = { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps' as const, equipment: 'barbell' as const, bodyweight: false };
    const content = buildExerciseHistory('back-squat', library, [
      { session: session({ id: 'b', startedAt: Date.UTC(2026, 10, 9, 10) }), sets: [entry('1', squat, 1, 80, 9), entry('0', squat, 0, 80, 10), entry('w', squat, 0, 40, 10, 'warmup')] },
      { session: session({ id: 'a', startedAt: Date.UTC(2026, 10, 2, 10), prescription: { templateName: 'Lower', exercises: [squat] } }), sets: [entry('9', squat, 0, null, 12, 'warmup')] },
    ], utc);
    expect(content).toMatchObject({ name: 'Back Squat', muscleGroupLabel: 'Quadriceps', sessionCountText: '2 sessions' });
    expect(content.sessions).toEqual([
      { sessionId: 'b', templateName: 'Full Body', dateText: 'Mon 9 Nov', setsText: '80 × 10, 80 × 9', warmupText: 'Warmup 40 × 10' },
      { sessionId: 'a', templateName: 'Lower', dateText: 'Mon 2 Nov', setsText: 'Warmups only', warmupText: 'Warmup 12 reps' },
    ]);
  });
});
