import type { OffsetAt } from '@/lib/utils/time';
import {
  completedCountsByWeek, completedInWeek, isSessionCompleted, nextTemplate, sessionAttribution, trainingWeekBounds,
} from './workouts.schedule';

const ms = (iso: string) => Date.parse(iso);
const utc: OffsetAt = () => 0;
const colombo: OffsetAt = () => 330;
/** America/New_York 2026: spring forward 8 Mar 07:00Z, fall back 1 Nov 06:00Z. */
const newYork: OffsetAt = (instant) =>
  instant >= ms('2026-03-08T07:00:00Z') && instant < ms('2026-11-01T06:00:00Z') ? -240 : -300;

const working = { type: 'working' as const };
const warmup = { type: 'warmup' as const };
const session = (id: string, templateId: string, startedAt: string, endedAt: string | null, sets: readonly { type: 'working' | 'warmup' }[] = [working]) => ({
  id, templateId, startedAt: ms(startedAt), endedAt: endedAt ? ms(endedAt) : null, sets,
});

describe('session completion', () => {
  test('a finished session with at least one working set is completed', () => {
    expect(isSessionCompleted(session('a', 't', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z'))).toBe(true);
  });
  test('an active session is not completed, however many working sets it has', () => {
    expect(isSessionCompleted(session('a', 't', '2026-11-09T10:00:00Z', null, [working, working]))).toBe(false);
  });
  test('a finished session with only warmups or no sets is not completed', () => {
    expect(isSessionCompleted(session('a', 't', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z', [warmup]))).toBe(false);
    expect(isSessionCompleted(session('b', 't', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z', []))).toBe(false);
  });
});

describe('training week bounds (Monday 04:00 local)', () => {
  test('a Wednesday falls in the week from that Monday 04:00 to the next Monday 04:00', () => {
    const week = trainingWeekBounds(ms('2026-11-11T12:00:00Z'), utc);
    expect(week).toEqual({
      startDay: '2026-11-09', endDay: '2026-11-15',
      startMs: ms('2026-11-09T04:00:00Z'), endMs: ms('2026-11-16T04:00:00Z'),
    });
  });
  test('Monday 03:59 local still belongs to the previous week; 04:00 starts the new one', () => {
    expect(trainingWeekBounds(ms('2026-11-09T03:59:59Z'), utc).startDay).toBe('2026-11-02');
    expect(trainingWeekBounds(ms('2026-11-09T04:00:00Z'), utc).startDay).toBe('2026-11-09');
  });
  test('Sunday night 23:59 and Monday 02:00 are both in the week ending that Sunday', () => {
    expect(trainingWeekBounds(ms('2026-11-15T23:59:00Z'), utc).startDay).toBe('2026-11-09');
    expect(trainingWeekBounds(ms('2026-11-16T02:00:00Z'), utc).startDay).toBe('2026-11-09');
  });
  test('uses the device-local boundary, not UTC', () => {
    // Colombo (+05:30): Monday 04:00 local is Sunday 22:30Z.
    const week = trainingWeekBounds(ms('2026-11-08T22:30:00Z'), colombo);
    expect(week.startDay).toBe('2026-11-09');
    expect(week.startMs).toBe(ms('2026-11-08T22:30:00Z'));
    expect(trainingWeekBounds(ms('2026-11-08T22:29:59Z'), colombo).startDay).toBe('2026-11-02');
  });
  test('spring-forward week is 167 hours but still starts and ends at 04:00 local', () => {
    const week = trainingWeekBounds(ms('2026-03-10T12:00:00Z'), newYork);
    expect(week.startDay).toBe('2026-03-09');
    // Mon 2026-03-09 04:00 EDT = 08:00Z; the previous week (Mar 2–8) contains the 23-hour day.
    expect(week.startMs).toBe(ms('2026-03-09T08:00:00Z'));
    const previous = trainingWeekBounds(ms('2026-03-05T12:00:00Z'), newYork);
    expect(previous.startMs).toBe(ms('2026-03-02T09:00:00Z')); // EST
    expect(previous.endMs).toBe(week.startMs);
    expect((previous.endMs - previous.startMs) / 3_600_000).toBe(167);
  });
  test('fall-back week is 169 hours', () => {
    const week = trainingWeekBounds(ms('2026-11-01T12:00:00Z'), newYork);
    expect(week.startDay).toBe('2026-10-26');
    expect(week.startMs).toBe(ms('2026-10-26T08:00:00Z'));
    expect(week.endMs).toBe(ms('2026-11-02T09:00:00Z'));
    expect((week.endMs - week.startMs) / 3_600_000).toBe(169);
  });
  test('an instant exactly at a DST-shifted Monday 04:00 starts that week', () => {
    expect(trainingWeekBounds(ms('2026-11-02T09:00:00Z'), newYork).startDay).toBe('2026-11-02');
    expect(trainingWeekBounds(ms('2026-11-02T08:59:59Z'), newYork).startDay).toBe('2026-10-26');
  });
});

describe('session attribution (D4)', () => {
  test('a session belongs to the day and week of its start, even if it ends after the boundary', () => {
    const late = session('a', 't', '2026-11-15T23:30:00Z', '2026-11-16T05:30:00Z');
    expect(sessionAttribution(late, utc)).toEqual({ day: '2026-11-15', weekStartDay: '2026-11-09' });
  });
  test('a session started before 04:00 belongs to the previous day', () => {
    const night = session('a', 't', '2026-11-16T02:00:00Z', '2026-11-16T03:00:00Z');
    expect(sessionAttribution(night, utc)).toEqual({ day: '2026-11-15', weekStartDay: '2026-11-09' });
  });
  test('an active session started last week is attributed to last week', () => {
    const stale = session('a', 't', '2026-11-03T10:00:00Z', null);
    expect(sessionAttribution(stale, utc).weekStartDay).toBe('2026-11-02');
  });
});

describe('completed counts per week', () => {
  const sessions = [
    session('a', 't1', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z'),
    session('b', 't2', '2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'),
    session('c', 't1', '2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z'),
    session('empty', 't2', '2026-11-10T10:00:00Z', '2026-11-10T11:00:00Z', []),
    session('warm', 't2', '2026-11-10T12:00:00Z', '2026-11-10T13:00:00Z', [warmup]),
    session('active', 't2', '2026-11-11T10:00:00Z', null),
  ];
  test('counts only completed sessions, keyed by the week start day', () => {
    expect(completedCountsByWeek(sessions, utc)).toEqual({ '2026-11-02': 2, '2026-11-09': 1 });
  });
  test('counts the week containing an instant', () => {
    expect(completedInWeek(sessions, ms('2026-11-12T00:00:00Z'), utc)).toBe(1);
    expect(completedInWeek(sessions, ms('2026-11-05T00:00:00Z'), utc)).toBe(2);
    expect(completedInWeek(sessions, ms('2026-11-23T00:00:00Z'), utc)).toBe(0);
  });
  test('a session started Sunday 23:00 counts in that week even if finished on Monday', () => {
    const overnight = [session('x', 't1', '2026-11-15T23:00:00Z', '2026-11-16T05:00:00Z')];
    expect(completedCountsByWeek(overnight, utc)).toEqual({ '2026-11-09': 1 });
  });
});

describe('next template in the rotation', () => {
  const rotation = [{ id: 'push' }, { id: 'pull' }, { id: 'legs' }];
  test('is the first template when nothing has been completed', () => {
    expect(nextTemplate(rotation, [])?.id).toBe('push');
  });
  test('continues after the template of the last completed session', () => {
    const done = [session('a', 'push', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z')];
    expect(nextTemplate(rotation, done)?.id).toBe('pull');
  });
  test('wraps around after the last template', () => {
    const done = [session('a', 'legs', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z')];
    expect(nextTemplate(rotation, done)?.id).toBe('push');
  });
  test('a missed day shifts the rotation: it continues from the template actually done', () => {
    const done = [
      session('a', 'push', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z'),
      session('b', 'legs', '2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'), // skipped pull
    ];
    expect(nextTemplate(rotation, done)?.id).toBe('push');
  });
  test('ignores active, empty and warmup-only sessions', () => {
    const done = [
      session('a', 'push', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z'),
      session('b', 'pull', '2026-11-03T10:00:00Z', '2026-11-03T11:00:00Z', []),
      session('c', 'pull', '2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z', [warmup]),
      session('d', 'pull', '2026-11-05T10:00:00Z', null),
    ];
    expect(nextTemplate(rotation, done)?.id).toBe('pull');
  });
  test('uses the latest start regardless of input order', () => {
    const done = [
      session('b', 'pull', '2026-11-04T10:00:00Z', '2026-11-04T11:00:00Z'),
      session('a', 'push', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z'),
    ];
    expect(nextTemplate(rotation, done)?.id).toBe('legs');
  });
  test('falls back to the first template when the last completed template left the rotation (G10)', () => {
    const done = [session('a', 'deleted', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z')];
    expect(nextTemplate(rotation, done)?.id).toBe('push');
  });
  test('a single-template rotation repeats it; an empty rotation has no next template', () => {
    const done = [session('a', 'only', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z')];
    expect(nextTemplate([{ id: 'only' }], done)?.id).toBe('only');
    expect(nextTemplate([], done)).toBeNull();
  });
  test('returns the full template object it was given', () => {
    const templates = [{ id: 'push', name: 'Push' }, { id: 'pull', name: 'Pull' }];
    expect(nextTemplate(templates, [])).toBe(templates[0]);
  });
});
