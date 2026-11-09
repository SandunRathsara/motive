import {
  compareWithPrevious, nextTimeLine, previousCompletedSession, summarizeSession,
  type NextTimeOutcome, type SummarySession,
} from './workouts.summary';

const exercises: Record<string, { muscleGroup: string; bodyweight: boolean }> = {
  'bench-press': { muscleGroup: 'chest', bodyweight: false },
  'push-up': { muscleGroup: 'chest', bodyweight: true },
  'barbell-row': { muscleGroup: 'back', bodyweight: false },
  squat: { muscleGroup: 'quadriceps', bodyweight: false },
};
const lookup = (exerciseId: string) => exercises[exerciseId];
const set = (exerciseId: string, loadKg: number | null, reps: number, type: 'working' | 'warmup' = 'working') => ({ exerciseId, type, loadKg, reps });
const ms = (iso: string) => Date.parse(iso);
const session = (id: string, templateId: string, startedAt: string, sets: SummarySession['sets'], endedAt: string | null = startedAt): SummarySession => ({
  id, templateId, startedAt: ms(startedAt), endedAt: endedAt ? ms(endedAt) : null, sets,
});

describe('summarizeSession', () => {
  test('volume sums load × reps of loaded working sets', () => {
    const summary = summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', [
      set('bench-press', 80, 8), set('bench-press', 80, 6), set('barbell-row', 60, 10),
    ]), lookup);
    expect(summary.volumeKg).toBe(80 * 8 + 80 * 6 + 60 * 10);
    expect(summary.workingSets).toBe(3);
  });

  test('warmups are excluded from volume, sets and muscle groups', () => {
    const summary = summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', [
      set('bench-press', 40, 10, 'warmup'), set('bench-press', 80, 5),
    ]), lookup);
    expect(summary.volumeKg).toBe(400);
    expect(summary.workingSets).toBe(1);
    expect(summary.setsByMuscleGroup).toEqual([{ muscleGroup: 'chest', sets: 1 }]);
  });

  test('extra working sets beyond the prescribed count add to volume', () => {
    const sets = [1, 2, 3, 4].map(() => set('bench-press', 50, 10));
    expect(summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', sets), lookup).volumeKg).toBe(2000);
  });

  test('bodyweight working sets count as sets and as a separate reps total, never as volume (G5)', () => {
    const summary = summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', [
      set('push-up', null, 12), set('push-up', null, 10), set('bench-press', 80, 5),
    ]), lookup);
    expect(summary.volumeKg).toBe(400);
    expect(summary.bodyweightReps).toBe(22);
    expect(summary.workingSets).toBe(3);
    expect(summary.setsByMuscleGroup).toEqual([{ muscleGroup: 'chest', sets: 3 }]);
  });

  test('sets per muscle group are sorted by sets descending, then name', () => {
    const summary = summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', [
      set('squat', 100, 5), set('barbell-row', 60, 8), set('bench-press', 80, 5), set('bench-press', 80, 5),
    ]), lookup);
    expect(summary.setsByMuscleGroup).toEqual([
      { muscleGroup: 'chest', sets: 2 }, { muscleGroup: 'back', sets: 1 }, { muscleGroup: 'quadriceps', sets: 1 },
    ]);
  });

  test('fractional loads do not accumulate floating-point noise', () => {
    const summary = summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', [set('bench-press', 82.5, 3), set('bench-press', 82.5, 3), set('bench-press', 0.1, 3)]), lookup);
    expect(summary.volumeKg).toBe(495.3);
  });

  test('an exercise missing from the library still counts toward volume but not a muscle group', () => {
    const summary = summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', [set('mystery', 10, 10)]), lookup);
    expect(summary.volumeKg).toBe(100);
    expect(summary.workingSets).toBe(1);
    expect(summary.setsByMuscleGroup).toEqual([]);
  });

  test('an empty session summarizes to zeros', () => {
    expect(summarizeSession(session('s', 't', '2026-11-09T10:00:00Z', []), lookup))
      .toEqual({ volumeKg: 0, workingSets: 0, bodyweightReps: 0, setsByMuscleGroup: [] });
  });
});

describe('previousCompletedSession', () => {
  const done = (id: string, templateId: string, start: string, sets = [set('bench-press', 80, 5)]) => session(id, templateId, start, sets, '2026-12-31T00:00:00Z');
  const current = done('current', 'push', '2026-11-09T10:00:00Z');

  test('is the latest earlier completed session of the same template', () => {
    const all = [
      done('old', 'push', '2026-10-26T10:00:00Z'), done('prev', 'push', '2026-11-02T10:00:00Z'),
      done('other', 'pull', '2026-11-05T10:00:00Z'), done('later', 'push', '2026-11-16T10:00:00Z'), current,
    ];
    expect(previousCompletedSession(current, all)?.id).toBe('prev');
  });

  test('skips active and non-completed sessions, and itself', () => {
    const all = [
      done('prev', 'push', '2026-10-26T10:00:00Z'),
      session('active', 'push', '2026-11-02T10:00:00Z', [set('bench-press', 80, 5)], null),
      done('empty', 'push', '2026-11-03T10:00:00Z', []), current,
    ];
    expect(previousCompletedSession(current, all)?.id).toBe('prev');
  });

  test('is null for the first session of a template', () => {
    expect(previousCompletedSession(current, [current])).toBeNull();
  });
});

describe('compareWithPrevious', () => {
  test('reports volume, set and bodyweight reps deltas against the previous session', () => {
    const previous = summarizeSession(session('p', 't', '2026-11-02T10:00:00Z', [set('bench-press', 80, 5), set('push-up', null, 10)]), lookup);
    const current = summarizeSession(session('c', 't', '2026-11-09T10:00:00Z', [set('bench-press', 80, 6), set('bench-press', 80, 6), set('push-up', null, 8)]), lookup);
    expect(compareWithPrevious(current, previous)).toEqual({
      previousVolumeKg: 400, volumeDeltaKg: 560, workingSetsDelta: 1, bodyweightRepsDelta: -2,
    });
  });

  test('is null when there is no previous session', () => {
    const current = summarizeSession(session('c', 't', '2026-11-09T10:00:00Z', [set('bench-press', 80, 6)]), lookup);
    expect(compareWithPrevious(current, null)).toBeNull();
  });
});

describe('nextTimeLine', () => {
  const outcome = (change: Partial<NextTimeOutcome> & Pick<NextTimeOutcome, 'exerciseName' | 'kind'>): NextTimeOutcome =>
    ({ loadKg: 60, reps: 8, failedSets: 0, ...change });

  test('builds the TRN-8 example line from progression outcomes', () => {
    expect(nextTimeLine([
      outcome({ exerciseName: 'Bench', kind: 'progress', loadKg: 82.5, reps: 6 }),
      outcome({ exerciseName: 'Row', kind: 'repeat', loadKg: 60, reps: 8, failedSets: 1 }),
    ])).toBe('Bench moves to 82.5 × 6; Row repeats 60 kg after 1 Failed Set');
  });

  test('pluralizes Failed Sets and omits the clause when there are none', () => {
    expect(nextTimeLine([outcome({ exerciseName: 'Row', kind: 'repeat', failedSets: 2 })])).toBe('Row repeats 60 kg after 2 Failed Sets');
    expect(nextTimeLine([outcome({ exerciseName: 'Row', kind: 'repeat' })])).toBe('Row repeats 60 kg');
  });

  test('describes a Load Reset by its new load and reps', () => {
    expect(nextTimeLine([outcome({ exerciseName: 'Squat', kind: 'loadReset', loadKg: 90, reps: 6 })])).toBe('Squat resets to 90 × 6');
  });

  test('bodyweight exercises are described by reps', () => {
    expect(nextTimeLine([
      outcome({ exerciseName: 'Push-up', kind: 'progress', loadKg: null, reps: 11 }),
      outcome({ exerciseName: 'Pull-up', kind: 'repeat', loadKg: null, reps: 8, failedSets: 1 }),
    ])).toBe('Push-up moves to 11 reps; Pull-up repeats 8 reps after 1 Failed Set');
  });

  test('a first session says where to start next time instead of "repeats"', () => {
    expect(nextTimeLine([
      outcome({ exerciseName: 'Bench', kind: 'firstUse', loadKg: 62.5, reps: 7 }),
      outcome({ exerciseName: 'Push-up', kind: 'firstUse', loadKg: null, reps: 8 }),
      outcome({ exerciseName: 'Row', kind: 'progress', loadKg: 62.5, reps: 6 }),
    ])).toBe('Bench: start next time at 62.5 kg × 7; Push-up: start next time at 8 reps; Row moves to 62.5 × 6');
  });

  test('is null when no exercise has an outcome to report', () => {
    expect(nextTimeLine([])).toBeNull();
  });

  test('keeps the order it is given, so the line is deterministic', () => {
    const a = outcome({ exerciseName: 'A', kind: 'progress', loadKg: 10, reps: 6 });
    const b = outcome({ exerciseName: 'B', kind: 'progress', loadKg: 20, reps: 6 });
    expect(nextTimeLine([a, b])).toBe('A moves to 10 × 6; B moves to 20 × 6');
    expect(nextTimeLine([a, b])).toBe(nextTimeLine([a, b]));
  });
});
