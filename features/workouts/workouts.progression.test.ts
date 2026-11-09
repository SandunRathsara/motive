import { computeProgression } from './workouts.progression';
import type { ProgressionPrescription, ProgressionSession, ProgressionSet } from './workouts.progression';

const barbell: ProgressionPrescription = { workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5, bodyweight: false };
const pullUp: ProgressionPrescription = { workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 0, bodyweight: true };

const work = (loadKg: number, reps: number): ProgressionSet => ({ type: 'working', loadKg, reps });
const warm = (loadKg: number, reps: number): ProgressionSet => ({ type: 'warmup', loadKg, reps });
const bodyweightSet = (reps: number): ProgressionSet => ({ type: 'working', loadKg: null, reps });
const session = (id: string, sets: ProgressionSet[], extra: Partial<ProgressionSession> = {}): ProgressionSession => ({ id, sets, ...extra });
/** Three working sets at one load. */
const trio = (loadKg: number, a: number, b: number, c: number) => [work(loadKg, a), work(loadKg, b), work(loadKg, c)];
const recs = (loadKg: number | null, ...reps: number[]) => reps.map((r) => ({ loadKg, reps: r }));

describe('first use', () => {
  test('has no Recommended Sets, last sets, outcome or Stall without finished history', () => {
    const result = computeProgression(barbell, []);
    expect(result.recommendedSets).toBeNull();
    expect(result.lastSets).toEqual([]);
    expect(result.outcome).toBeNull();
    expect(result.loadReset).toBeNull();
    expect(result.sessionCount).toBe(0);
    expect(result.stall).toEqual({ failedSessionStreak: 0, noRepGainStreak: 0, events: [] });
  });

  test('a session with no working sets for the exercise is not history', () => {
    const result = computeProgression(barbell, [session('s1', [warm(40, 10)]), session('s2', [])]);
    expect(result.recommendedSets).toBeNull();
    expect(result.sessionCount).toBe(0);
  });

  test('the first prescribed working set sets the reference load; each set then adds one rep', () => {
    const result = computeProgression(barbell, [session('s1', trio(80, 8, 7, 7))]);
    expect(result.recommendedSets).toEqual(recs(80, 9, 8, 8));
    expect(result.sessionCount).toBe(1);
  });

  test('sets logged below the reference load do not count and restart at the bottom of the range', () => {
    const result = computeProgression(barbell, [session('s1', [work(80, 8), work(70, 10), work(80, 7)])]);
    expect(result.recommendedSets).toEqual(recs(80, 9, 6, 8));
  });

  test('a prescribed set that was not logged starts at the bottom of the range', () => {
    const result = computeProgression(barbell, [session('s1', [work(80, 8), work(80, 8)])]);
    expect(result.recommendedSets).toEqual(recs(80, 9, 9, 6));
  });
});

describe('double progression', () => {
  test('Progress: all prescribed sets at the top of the range add one increment and reset reps to the bottom', () => {
    const result = computeProgression(barbell, [session('s1', trio(80, 10, 10, 10))]);
    expect(result.recommendedSets).toEqual(recs(82.5, 6, 6, 6));
    expect(result.outcome).toMatchObject({ type: 'progress', sessionId: 's1', fromKg: 80, loadKg: 82.5, reps: 6 });
  });

  test('otherwise repeats the load with last reps + 1, capped at the top of the range', () => {
    const result = computeProgression(barbell, [session('s1', trio(80, 10, 9, 7))]);
    expect(result.recommendedSets).toEqual(recs(80, 10, 10, 8));
    expect(result.outcome).toMatchObject({ type: 'repeat', loadKg: 80, reps: 10, failedSetCount: 0 });
  });

  test('builds on the previous recommendation, session to session, never within a session', () => {
    const history = [
      session('s1', trio(80, 8, 8, 8)), // recommends 80 × 9, 9, 9
      session('s2', trio(80, 9, 9, 9)), // recommends 80 × 10, 10, 10
      session('s3', trio(80, 10, 10, 10)),
    ];
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(82.5, 6, 6, 6));
  });

  test('warmups and extra working sets are ignored by progression', () => {
    const sets = [warm(40, 12), ...trio(80, 10, 10, 10), work(60, 3)];
    expect(computeProgression(barbell, [session('s1', sets)]).recommendedSets).toEqual(recs(82.5, 6, 6, 6));
  });

  test('extra working sets above the recommended load do not change the prescribed sets', () => {
    const history = [session('s1', trio(80, 10, 10, 9)), session('s2', [...trio(80, 10, 10, 10), work(100, 10)])];
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(82.5, 6, 6, 6));
  });

  test('Progress needs every set at or above the recommended load', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', [work(80, 10), work(80, 10), work(75, 10)])];
    // Third set is below 80, so it does not count: keeps its previous Recommended Set (80 × 9), no +1.
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(80, 10, 10, 9));
  });

  test('a heavier actual load does not become the reference: progression builds on the recommended load', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', trio(85, 10, 10, 10))];
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(82.5, 6, 6, 6));
  });

  test('a heavier set repeats the recommended load with the actual reps + 1', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', [work(85, 8), work(80, 9), work(80, 9)])];
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(80, 9, 10, 10));
  });

  test('Incomplete: Progress needs every prescribed set logged, and the missing set keeps its Recommended Set', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', [work(80, 10), work(80, 10)])];
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(80, 10, 10, 9));
  });

  test('Recommended Sets never fall below the bottom of the range', () => {
    expect(computeProgression(barbell, [session('s1', trio(80, 3, 4, 5))]).recommendedSets).toEqual(recs(80, 6, 6, 6));
  });

  test('uses the increment to the decimal without float drift', () => {
    const tenth: ProgressionPrescription = { ...barbell, incrementKg: 0.1 };
    expect(computeProgression(tenth, [session('s1', trio(80.2, 10, 10, 10))]).recommendedSets).toEqual(recs(80.3, 6, 6, 6));
  });
});

describe('bodyweight', () => {
  test('progress by reps only, capped at the top of the range', () => {
    const result = computeProgression(pullUp, [session('s1', [bodyweightSet(8), bodyweightSet(7), bodyweightSet(6)])]);
    expect(result.recommendedSets).toEqual(recs(null, 9, 8, 7));
  });

  test('stay at the top of the range once reached; no added load', () => {
    const result = computeProgression(pullUp, [session('s1', [bodyweightSet(10), bodyweightSet(10), bodyweightSet(10)])]);
    expect(result.recommendedSets).toEqual(recs(null, 10, 10, 10));
    expect(result.outcome).toMatchObject({ type: 'repeat', loadKg: null, reps: 10 });
  });

  test('record Failed Sets but never Stall or Load Reset', () => {
    const failing = [bodyweightSet(4), bodyweightSet(4), bodyweightSet(4)];
    const result = computeProgression(pullUp, [session('s1', failing), session('s2', failing), session('s3', failing), session('s4', failing)]);
    expect(result.sessions.map((s) => s.failedSetIndexes)).toEqual([[0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2]]);
    expect(result.stall).toEqual({ failedSessionStreak: 0, noRepGainStreak: 0, events: [] });
    expect(result.loadReset).toBeNull();
    expect(result.recommendedSets).toEqual(recs(null, 6, 6, 6));
  });
});

describe('Failed Set', () => {
  test('is a prescribed set below the bottom of the range, marked per session and repeated at the same load', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', [work(80, 9), work(80, 5), work(80, 9)])];
    const result = computeProgression(barbell, history);
    expect(result.sessions[1]).toMatchObject({ sessionId: 's2', failedSetIndexes: [1] });
    expect(result.recommendedSets).toEqual(recs(80, 10, 6, 10));
    expect(result.outcome).toMatchObject({ type: 'repeat', loadKg: 80, failedSetCount: 1 });
  });

  test('extra working sets and sets below the recommended load are not Failed Sets', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', [work(80, 9), work(80, 9), work(80, 9), work(80, 2)])];
    expect(computeProgression(barbell, history).sessions[1]?.failedSetIndexes).toEqual([]);
    const lighter = [session('s1', trio(80, 8, 8, 8)), session('s2', [work(80, 9), work(80, 9), work(60, 2)])];
    expect(computeProgression(barbell, lighter).sessions[1]?.failedSetIndexes).toEqual([]);
  });
});

describe('Stall and Load Reset', () => {
  const failing = (loadKg: number) => [work(loadKg, 9), work(loadKg, 5), work(loadKg, 9)];

  test('one session with a Failed Set is not a Stall', () => {
    const result = computeProgression(barbell, [session('s1', trio(80, 8, 8, 8)), session('s2', failing(80))]);
    expect(result.stall.failedSessionStreak).toBe(1);
    expect(result.stall.events).toEqual([]);
    expect(result.loadReset).toBeNull();
  });

  test('2 sessions in a row with a Failed Set Stall, then reset about −10% rounded down to the increment', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', failing(80)), session('s3', failing(80))];
    const result = computeProgression(barbell, history);
    // 80 × 0.9 = 72, rounded down to a multiple of 2.5 = 70.
    expect(result.recommendedSets).toEqual(recs(70, 6, 6, 6));
    expect(result.stall.events).toEqual([{ sessionId: 's3', kind: 'failed-sets' }]);
    expect(result.loadReset).toEqual({
      kind: 'failed-sets', sessions: 2, fromKg: 80, toKg: 70, minReps: 6,
      reasonLine: 'Reset after 2 sessions under 6 reps',
    });
    expect(result.outcome).toMatchObject({ type: 'load-reset', sessionId: 's3', fromKg: 80, loadKg: 70, reps: 6 });
    expect(result.stall.failedSessionStreak).toBe(0);
  });

  test('a session without a Failed Set breaks the failed streak', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', failing(80)), session('s3', trio(80, 9, 9, 9)), session('s4', failing(80))];
    const result = computeProgression(barbell, history);
    expect(result.stall.events).toEqual([]);
    expect(result.stall.failedSessionStreak).toBe(1);
  });

  test('3 sessions in a row at one load with no rep gain Stall', () => {
    // Recommended load stays 80 with totals 24, 24, 24: each of the last two ≤ the previous.
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', trio(80, 8, 8, 8)), session('s3', trio(80, 8, 8, 8))];
    const result = computeProgression(barbell, history);
    expect(result.stall.events).toEqual([{ sessionId: 's3', kind: 'no-rep-gain' }]);
    expect(result.recommendedSets).toEqual(recs(70, 6, 6, 6));
    expect(result.loadReset).toMatchObject({ kind: 'no-rep-gain', sessions: 3, reasonLine: 'Reset after 3 sessions with no rep gain' });
  });

  test('a rep gain restarts the no-gain count with that session as its first', () => {
    // totals at 80 kg: 24, 25, 25, 24. The gain on s2 makes s2 the first of a new count; s3 and s4 are both ≤ previous.
    const history = [
      session('s1', trio(80, 8, 8, 8)), session('s2', trio(80, 9, 8, 8)),
      session('s3', trio(80, 9, 8, 8)), session('s4', trio(80, 8, 8, 8)),
    ];
    const result = computeProgression(barbell, history);
    expect(result.stall.events).toEqual([{ sessionId: 's4', kind: 'no-rep-gain' }]);
    const notYet = computeProgression(barbell, history.slice(0, 3));
    expect(notYet.stall.events).toEqual([]);
    expect(notYet.stall.noRepGainStreak).toBe(2);
  });

  test('sessions at different recommended loads never count as one no-gain run', () => {
    const history = [
      session('s1', trio(80, 10, 10, 10)), // Progress to 82.5
      session('s2', trio(82.5, 6, 6, 6)),   // total 18 ≤ 30 but a different load
      session('s3', trio(82.5, 6, 6, 6)),
    ];
    const result = computeProgression(barbell, history);
    expect(result.stall.events).toEqual([]);
    expect(result.stall.noRepGainStreak).toBe(2);
  });

  test('counters restart after a Load Reset; the session at the reset load is the first of a new count', () => {
    const history = [
      session('s1', trio(80, 8, 8, 8)), session('s2', failing(80)), session('s3', failing(80)), // Stall → 70
      session('s4', [work(70, 5), work(70, 9), work(70, 9)]), // Failed Set at the reset load: first of a new count
    ];
    const afterOne = computeProgression(barbell, history);
    expect(afterOne.stall.failedSessionStreak).toBe(1);
    expect(afterOne.stall.events).toEqual([{ sessionId: 's3', kind: 'failed-sets' }]);
    expect(afterOne.loadReset).toBeNull();
    const afterTwo = computeProgression(barbell, [...history, session('s5', [work(70, 5), work(70, 9), work(70, 9)])]);
    expect(afterTwo.stall.events.map((e) => e.sessionId)).toEqual(['s3', 's5']);
    expect(afterTwo.recommendedSets).toEqual(recs(62.5, 6, 6, 6)); // 63 → down to 62.5
  });

  test('a Load Reset never rises above the current load or below one increment', () => {
    const light: ProgressionPrescription = { ...barbell, incrementKg: 5 };
    const history = [session('s1', trio(5, 8, 8, 8)), session('s2', trio(5, 5, 5, 5)), session('s3', trio(5, 5, 5, 5))];
    expect(computeProgression(light, history).recommendedSets).toEqual(recs(5, 6, 6, 6));
    const tiny = [session('s1', trio(2, 8, 8, 8)), session('s2', trio(2, 5, 5, 5)), session('s3', trio(2, 5, 5, 5))];
    expect(computeProgression(light, tiny).recommendedSets).toEqual(recs(2, 6, 6, 6));
  });

  test('rounds the reset down exactly when 90% lands on an increment multiple', () => {
    const history = [session('s1', trio(100, 5, 5, 5)), session('s2', trio(100, 5, 5, 5))];
    expect(computeProgression(barbell, history).recommendedSets).toEqual(recs(90, 6, 6, 6));
  });
});

describe('Deload sessions', () => {
  test('are excluded from history, so progression resumes from the pre-Deload recommendation', () => {
    const history = [
      session('s1', trio(80, 8, 8, 8)),
      session('s2', [work(80, 10), work(80, 10)], { deload: true }),
      session('s3', trio(80, 9, 9, 9)),
    ];
    const result = computeProgression(barbell, history);
    expect(result.recommendedSets).toEqual(recs(80, 10, 10, 10));
    expect(result.sessionCount).toBe(2);
    expect(result.sessions.map((s) => s.sessionId)).toEqual(['s1', 's3']);
  });

  test('do not break or extend Stall counters', () => {
    const failing = [work(80, 9), work(80, 5), work(80, 9)];
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', failing), session('s3', trio(80, 10, 10, 10), { deload: true }), session('s4', failing)];
    expect(computeProgression(barbell, history).stall.events).toEqual([{ sessionId: 's4', kind: 'failed-sets' }]);
  });
});

describe('prescription changes (TRN-5)', () => {
  test('a changed rep range keeps the load and moves reps to the new bottom', () => {
    const history = [session('s1', trio(80, 9, 9, 9), { prescription: barbell })];
    const widened: ProgressionPrescription = { ...barbell, repRange: { min: 8, max: 12 } };
    expect(computeProgression(widened, history).recommendedSets).toEqual(recs(80, 8, 8, 8));
  });

  test('a session is judged by the prescription it was started with', () => {
    const history = [session('s1', trio(80, 10, 10, 10), { prescription: barbell })];
    const narrowed: ProgressionPrescription = { ...barbell, repRange: { min: 6, max: 12 } };
    // Top of the old range was reached, so the load progressed; reps move to the new bottom.
    expect(computeProgression(narrowed, history).recommendedSets).toEqual(recs(82.5, 6, 6, 6));
  });

  test('the current increment is used for the next step', () => {
    const history = [session('s1', trio(80, 10, 10, 10), { prescription: barbell })];
    expect(computeProgression({ ...barbell, incrementKg: 5 }, history).recommendedSets).toEqual(recs(85, 6, 6, 6));
  });

  test('a changed working-set count resizes the Recommended Sets, copying the last set', () => {
    const history = [session('s1', trio(80, 8, 9, 10), { prescription: barbell })];
    expect(computeProgression({ ...barbell, workingSets: 4 }, history).recommendedSets).toEqual(recs(80, 9, 10, 10, 10));
    expect(computeProgression({ ...barbell, workingSets: 2 }, history).recommendedSets).toEqual(recs(80, 9, 10));
  });

  test('replays with the session snapshot when the working-set count differs', () => {
    const four: ProgressionPrescription = { ...barbell, workingSets: 4 };
    const history = [session('s1', [...trio(80, 10, 10, 10), work(80, 10)], { prescription: four })];
    expect(computeProgression(four, history).recommendedSets).toEqual(recs(82.5, 6, 6, 6, 6));
  });
});

describe('last actual sets', () => {
  test('are the working sets of the most recent finished session, by index, warmups excluded', () => {
    const history = [session('s1', trio(70, 8, 8, 8)), session('s2', [warm(40, 12), work(80, 9), work(80, 8), work(80, 7), work(60, 12)])];
    expect(computeProgression(barbell, history).lastSets).toEqual([
      { loadKg: 80, reps: 9 }, { loadKg: 80, reps: 8 }, { loadKg: 80, reps: 7 }, { loadKg: 60, reps: 12 },
    ]);
  });

  test('skip Deload sessions', () => {
    const history = [session('s1', trio(70, 8, 8, 8)), session('s2', trio(50, 8, 8, 8), { deload: true })];
    expect(computeProgression(barbell, history).lastSets).toEqual([{ loadKg: 70, reps: 8 }, { loadKg: 70, reps: 8 }, { loadKg: 70, reps: 8 }]);
  });
});

describe('purity', () => {
  test('does not mutate its inputs and is deterministic', () => {
    const history = [session('s1', trio(80, 8, 8, 8)), session('s2', trio(80, 9, 9, 9))];
    const snapshot = JSON.stringify(history);
    expect(computeProgression(barbell, history)).toEqual(computeProgression(barbell, history));
    expect(JSON.stringify(history)).toBe(snapshot);
  });
});
