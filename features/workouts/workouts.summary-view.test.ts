import type { HealthWorkout } from '@/features/health';
import { buildSessionSummary } from './workouts.summary-view';
import { session, t0, utc } from './workouts.test-kit';

describe('Summary (S5)', () => {
  const base = {
    session: session({ endedAt: t0 + 45 * 60_000, completed: true }),
    summary: { volumeKg: 4320, workingSets: 14, bodyweightReps: 0, setsByMuscleGroup: [{ muscleGroup: 'quadriceps', sets: 9 }, { muscleGroup: 'chest', sets: 5 }] },
    nextTimeLine: 'Bench Press moves to 82.5 × 6', linkedWorkout: null, previous: { startedAt: Date.UTC(2026, 10, 2, 10), prescription: { templateName: 'Full Body' } },
  };
  test('volume, muscle groups, comparison, next-time line and counting', () => {
    const content = buildSessionSummary({ ...base, comparison: { previousVolumeKg: 4200, volumeDeltaKg: 120, workingSetsDelta: 0, bodyweightRepsDelta: 0 } }, utc);
    expect(content).toMatchObject({
      templateName: 'Full Body', dateText: 'Mon 9 Nov', durationText: '45 min', volumeText: '4,320 kg', setsText: '14 working sets',
      bodyweightRepsText: null, nextTimeLine: 'Bench Press moves to 82.5 × 6', counts: true, countsText: 'Counts toward your weekly target',
      comparison: { text: '+120 kg vs Full Body on Mon 2 Nov', direction: 'up' }, linkedWorkoutText: null,
    });
    expect(content.muscleGroups).toEqual([
      { muscleGroup: 'quadriceps', label: 'Quadriceps', sets: 9, text: 'Quadriceps · 9 sets' }, { muscleGroup: 'chest', label: 'Chest', sets: 5, text: 'Chest · 5 sets' },
    ]);
  });

  test('down, same and no previous comparison', () => {
    const down = buildSessionSummary({ ...base, comparison: { previousVolumeKg: 4500, volumeDeltaKg: -180, workingSetsDelta: 0, bodyweightRepsDelta: 0 } }, utc);
    expect(down.comparison).toEqual({ text: '−180 kg vs Full Body on Mon 2 Nov', direction: 'down' });
    const same = buildSessionSummary({ ...base, comparison: { previousVolumeKg: 4320, volumeDeltaKg: 0, workingSetsDelta: 0, bodyweightRepsDelta: 0 } }, utc);
    expect(same.comparison).toEqual({ text: 'Same as Full Body on Mon 2 Nov', direction: 'same' });
    expect(buildSessionSummary({ ...base, comparison: null, previous: null }, utc).comparison).toBeNull();
  });

  test('a bodyweight-only session shows reps instead of volume; a session without working sets does not count', () => {
    const content = buildSessionSummary({
      ...base, session: session({ endedAt: t0 + 60_000, completed: false }), summary: { volumeKg: 0, workingSets: 0, bodyweightReps: 36, setsByMuscleGroup: [] },
      comparison: { previousVolumeKg: 0, volumeDeltaKg: 0, workingSetsDelta: 0, bodyweightRepsDelta: 6 },
    }, utc);
    expect(content).toMatchObject({ volumeText: '—', bodyweightRepsText: '36 bodyweight reps', counts: false, countsText: 'No working sets, so this session does not count' });
    expect(content.comparison).toEqual({ text: '+6 reps vs Full Body on Mon 2 Nov', direction: 'up' });
  });

  test('a linked Health workout is shown as context', () => {
    const linked = { id: 'w', startMs: t0, endMs: t0 + 50 * 60_000, activityType: 20 } as unknown as HealthWorkout;
    expect(buildSessionSummary({ ...base, comparison: null, previous: null, linkedWorkout: linked }, utc).linkedWorkoutText)
      .toBe('Linked: Functional strength training · 50 min');
  });
});
