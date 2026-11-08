import { summarizeGateMetrics } from './report.utils';

const eventTypes = ['food_active_input', 'recognition_wait', 'set_logging', 'unclean_exit'];
const sample = (event_type: string, duration_ms: number | null, extra: { build?: string; recorded_at?: number } = {}) => ({
  event_type, duration_ms, build: '1.0.0+1', recorded_at: Date.UTC(2026, 10, 8, 12), ...extra,
});

test('empty reports retain the known vocabulary in display order with unknown durations', () => {
  expect(summarizeGateMetrics([], { eventTypes })).toEqual({
    groups: [
      { eventType: 'food_active_input', count: 0, medianMs: null, p90Ms: null },
      { eventType: 'recognition_wait', count: 0, medianMs: null, p90Ms: null, p95Ms: null },
      { eventType: 'set_logging', count: 0, medianMs: null, p90Ms: null },
      { eventType: 'unclean_exit', count: 0, medianMs: null, p90Ms: null },
    ],
    builds: [], uncleanExitCount: 0, dailyTotals: [],
  });
});

test('uses nearest-rank percentiles, including the lower middle sample and recognition-wait p95', () => {
  const rows = [
    ...[2000, 100, 1900, 200, 1800, 300, 1700, 400, 1600, 500, 1500, 600, 1400, 700, 1300, 800, 1200, 900, 1100, 1000]
      .map((duration) => sample('recognition_wait', duration)),
    ...[11, 500, 1, 71, 5, 12].map((duration) => sample('set_logging', duration)),
  ];
  const { groups } = summarizeGateMetrics(rows, { eventTypes });
  expect(groups[1]).toEqual({ eventType: 'recognition_wait', count: 20, medianMs: 1000, p90Ms: 1800, p95Ms: 1900 });
  expect(groups[2]).toEqual({ eventType: 'set_logging', count: 6, medianMs: 11, p90Ms: 500 });
  expect(rows[0].duration_ms).toBe(2000);
});

test.each([
  { durations: [400], count: 1, medianMs: null, p90Ms: null, p95Ms: null },
  { durations: [400, 300, 200, 100], count: 4, medianMs: null, p90Ms: null, p95Ms: null },
  { durations: [400, 300, 200, 100, 0], count: 5, medianMs: 200, p90Ms: 400, p95Ms: 400 },
])('keeps the count but suppresses statistics below five samples: $durations', ({ durations, count, medianMs, p90Ms, p95Ms }) => {
  const { groups } = summarizeGateMetrics(durations.map((duration) => sample('recognition_wait', duration)), { eventTypes });
  expect(groups[1]).toEqual({ eventType: 'recognition_wait', count, medianMs, p90Ms, p95Ms });
});

test('accepts arbitrary vocabulary, appends unknown types alphabetically, and exposes crash evidence without durations', () => {
  const rows = [
    sample('z_future', 500),
    ...[null, null, null, null, null].map((duration) => sample('unclean_exit', duration)),
    ...[0, 0, 0, 0, 0].map((duration) => sample('a_future', duration)),
  ];
  const report = summarizeGateMetrics(rows, { eventTypes: ['custom_z', 'recognition_wait', 'unclean_exit'] });
  expect(report.groups).toEqual([
    { eventType: 'custom_z', count: 0, medianMs: null, p90Ms: null },
    { eventType: 'recognition_wait', count: 0, medianMs: null, p90Ms: null, p95Ms: null },
    { eventType: 'unclean_exit', count: 5, medianMs: null, p90Ms: null },
    { eventType: 'a_future', count: 5, medianMs: 0, p90Ms: 0 },
    { eventType: 'z_future', count: 1, medianMs: null, p90Ms: null },
  ]);
  expect(report.uncleanExitCount).toBe(5);
});

test('daily input totals combine food and training across the 04:00 local boundary, excluding waits and other events', () => {
  const rows = [
    sample('food_active_input', 0, { recorded_at: Date.UTC(2026, 10, 8, 22, 30) }),
    sample('set_logging', 2000, { recorded_at: Date.UTC(2026, 10, 7, 22, 30) }),
    sample('food_active_input', 1000, { recorded_at: Date.UTC(2026, 10, 7, 22, 29, 59) }),
    sample('recognition_wait', 99000), sample('future_event', 9000), sample('unclean_exit', null),
    sample('food_active_input', 3000),
  ];
  expect(summarizeGateMetrics(rows, { eventTypes, offsetAt: () => 330 }).dailyTotals).toEqual([
    { day: '2026-11-07', totalMs: 1000, count: 1 },
    { day: '2026-11-08', totalMs: 5000, count: 2 },
    { day: '2026-11-09', totalMs: 0, count: 1 },
  ]);
});

test('build selection filters statistics, daily totals and crash evidence but never the contributing-build counts', () => {
  const rows = [
    sample('food_active_input', 9000, { build: '1.0.0+2' }),
    sample('food_active_input', 8000, { build: '1.0.0+2' }),
    sample('set_logging', 250, { build: '1.0.0+2' }),
    sample('unclean_exit', null, { build: '1.0.0+2' }),
    sample('unclean_exit', null, { build: '1.0.0+2' }),
    ...[100, 200, 300, 400, 500].map((duration) => sample('food_active_input', duration)),
    sample('unclean_exit', null),
  ];
  const all = summarizeGateMetrics(rows, { eventTypes, offsetAt: () => 0 });
  const selected = summarizeGateMetrics(rows, { eventTypes, build: '1.0.0+1', offsetAt: () => 0 });
  const missing = summarizeGateMetrics(rows, { eventTypes, build: 'missing', offsetAt: () => 0 });
  const builds = [{ build: '1.0.0+1', count: 6 }, { build: '1.0.0+2', count: 5 }];
  expect(all.builds).toEqual(builds);
  expect(all.groups[0]).toEqual({ eventType: 'food_active_input', count: 7, medianMs: 400, p90Ms: 9000 });
  expect(all.uncleanExitCount).toBe(3);
  expect(all.dailyTotals).toEqual([{ day: '2026-11-08', totalMs: 18750, count: 8 }]);
  expect(selected.builds).toEqual(builds);
  expect(selected.groups[0]).toEqual({ eventType: 'food_active_input', count: 5, medianMs: 300, p90Ms: 500 });
  expect(selected.groups[2]).toEqual({ eventType: 'set_logging', count: 0, medianMs: null, p90Ms: null });
  expect(selected.uncleanExitCount).toBe(1);
  expect(selected.dailyTotals).toEqual([{ day: '2026-11-08', totalMs: 1500, count: 5 }]);
  expect(missing.builds).toEqual(builds);
  expect(missing.groups.map((group) => group.count)).toEqual([0, 0, 0, 0]);
  expect(missing.uncleanExitCount).toBe(0);
  expect(missing.dailyTotals).toEqual([]);
});
