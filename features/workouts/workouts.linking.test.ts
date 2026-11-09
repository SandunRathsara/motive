import { linkWorkouts } from './workouts.linking';

const ms = (iso: string) => Date.parse(iso);
const session = (id: string, start: string, end: string | null) => ({ id, startedAt: ms(start), endedAt: end ? ms(end) : null });
const workout = (id: string, start: string, end: string) => ({ id, startMs: ms(start), endMs: ms(end) });
const now = ms('2026-11-09T20:00:00Z');

test('a workout overlapping a session by at least half of the shorter window links to it', () => {
  const result = linkWorkouts([session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z')], [workout('w', '2026-11-09T10:30:00Z', '2026-11-09T11:30:00Z')], now);
  expect(result.links).toEqual([{ sessionId: 's', workoutId: 'w', overlapMs: 30 * 60_000 }]);
  expect(result.otherActivity).toEqual([]);
});

test('exactly 50% of the shorter window qualifies; just under does not', () => {
  const s = session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  expect(linkWorkouts([s], [workout('w', '2026-11-09T10:30:00Z', '2026-11-09T12:00:00Z')], now).links).toHaveLength(1);
  const under = linkWorkouts([s], [workout('w', '2026-11-09T10:30:01Z', '2026-11-09T12:00:00Z')], now);
  expect(under.links).toEqual([]);
  expect(under.otherActivity.map((w) => w.id)).toEqual(['w']);
});

test('the threshold uses the shorter window: a short workout inside a long session links', () => {
  const s = session('s', '2026-11-09T10:00:00Z', '2026-11-09T12:00:00Z');
  const w = workout('w', '2026-11-09T10:30:00Z', '2026-11-09T10:50:00Z');
  expect(linkWorkouts([s], [w], now).links).toEqual([{ sessionId: 's', workoutId: 'w', overlapMs: 20 * 60_000 }]);
});

test('a workout overlapping no session is Other Activity', () => {
  const result = linkWorkouts([session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z')], [workout('w', '2026-11-09T13:00:00Z', '2026-11-09T14:00:00Z')], now);
  expect(result.links).toEqual([]);
  expect(result.otherActivity.map((w) => w.id)).toEqual(['w']);
});

test('windows that only touch do not link', () => {
  const result = linkWorkouts([session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z')], [workout('w', '2026-11-09T11:00:00Z', '2026-11-09T12:00:00Z')], now);
  expect(result.links).toEqual([]);
});

test('with no sessions every workout is Other Activity, ordered by start', () => {
  const result = linkWorkouts([], [workout('late', '2026-11-09T15:00:00Z', '2026-11-09T16:00:00Z'), workout('early', '2026-11-09T09:00:00Z', '2026-11-09T10:00:00Z')], now);
  expect(result.otherActivity.map((w) => w.id)).toEqual(['early', 'late']);
});

test('an active session is treated as running until now', () => {
  const s = session('s', '2026-11-09T19:00:00Z', null);
  const w = workout('w', '2026-11-09T19:30:00Z', '2026-11-09T20:30:00Z');
  expect(linkWorkouts([s], [w], now).links).toEqual([{ sessionId: 's', workoutId: 'w', overlapMs: 30 * 60_000 }]);
});

test('when several workouts qualify for one session, the largest overlap links and the rest are Other Activity', () => {
  const s = session('s', '2026-11-09T10:00:00Z', '2026-11-09T12:00:00Z');
  const small = workout('small', '2026-11-09T10:00:00Z', '2026-11-09T10:40:00Z');
  const big = workout('big', '2026-11-09T10:30:00Z', '2026-11-09T12:00:00Z');
  const result = linkWorkouts([s], [small, big], now);
  expect(result.links).toEqual([{ sessionId: 's', workoutId: 'big', overlapMs: 90 * 60_000 }]);
  expect(result.otherActivity.map((w) => w.id)).toEqual(['small']);
});

test('one workout qualifying for two sessions is assigned greedily by overlap size, one-to-one (G8)', () => {
  const first = session('first', '2026-11-09T10:00:00Z', '2026-11-09T10:40:00Z');
  const second = session('second', '2026-11-09T10:45:00Z', '2026-11-09T12:00:00Z');
  const long = workout('long', '2026-11-09T10:10:00Z', '2026-11-09T11:30:00Z'); // 30 min with first, 45 with second
  const other = workout('other', '2026-11-09T10:00:00Z', '2026-11-09T10:30:00Z'); // 30 min with first only
  const result = linkWorkouts([first, second], [long, other], now);
  expect(result.links).toEqual([
    { sessionId: 'second', workoutId: 'long', overlapMs: 45 * 60_000 },
    { sessionId: 'first', workoutId: 'other', overlapMs: 30 * 60_000 },
  ]);
  expect(result.otherActivity).toEqual([]);
});

test('a workout losing its only session to a larger overlap becomes Other Activity', () => {
  const s = session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  const big = workout('big', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  const small = workout('small', '2026-11-09T10:00:00Z', '2026-11-09T10:40:00Z');
  const result = linkWorkouts([s], [small, big], now);
  expect(result.links.map((l) => l.workoutId)).toEqual(['big']);
  expect(result.otherActivity.map((w) => w.id)).toEqual(['small']);
});

test('overlap ties go to the session that started earlier, regardless of input order', () => {
  const early = session('early', '2026-11-09T10:00:00Z', '2026-11-09T10:30:00Z');
  const late = session('late', '2026-11-09T10:30:00Z', '2026-11-09T11:00:00Z');
  const w = workout('w', '2026-11-09T10:15:00Z', '2026-11-09T10:45:00Z'); // 15 min each
  for (const sessions of [[early, late], [late, early]]) {
    expect(linkWorkouts(sessions, [w], now).links).toEqual([{ sessionId: 'early', workoutId: 'w', overlapMs: 15 * 60_000 }]);
  }
});

test('the result does not depend on the order workouts are supplied', () => {
  const s = session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  const a = workout('a', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  const b = workout('b', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  expect(linkWorkouts([s], [a, b], now)).toEqual(linkWorkouts([s], [b, a], now));
});

test('deleting a workout in Health relinks the remaining one on the next read (derived on read)', () => {
  const s = session('s', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  const linked = workout('linked', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z');
  const other = workout('other', '2026-11-09T10:00:00Z', '2026-11-09T10:40:00Z');
  expect(linkWorkouts([s], [linked, other], now).links[0].workoutId).toBe('linked');
  const after = linkWorkouts([s], [other], now);
  expect(after.links[0].workoutId).toBe('other');
  expect(after.otherActivity).toEqual([]);
});

test('workouts keep their own extra fields in the Other Activity result', () => {
  const w = { ...workout('w', '2026-11-09T13:00:00Z', '2026-11-09T14:00:00Z'), activityType: 'running' };
  expect(linkWorkouts([], [w], now).otherActivity[0]).toBe(w);
});
