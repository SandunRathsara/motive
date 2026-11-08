import { metrics } from '@/features/metrics';
import { GateReportError, loadGateReport } from './report';

jest.mock('@/features/metrics', () => ({
  metrics: { list: jest.fn() },
  metricEventTypes: ['food_active_input', 'recognition_wait', 'set_logging', 'unclean_exit'],
}));
const repository = jest.mocked(metrics);

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test('loads the full validated history up to now, preserves skipped rows and passes the build and local-day options through', async () => {
  const now = Date.UTC(2026, 10, 8, 12);
  jest.spyOn(Date, 'now').mockReturnValue(now);
  repository.list.mockResolvedValue({ rows: [
    { id: '00000000-0000-4000-8000-000000000001', event_type: 'set_logging', duration_ms: 120, build: '1.0.0+1', recorded_at: Date.UTC(2026, 10, 7, 22, 30) },
    { id: '00000000-0000-4000-8000-000000000002', event_type: 'unclean_exit', duration_ms: null, build: '1.0.0+2', recorded_at: now },
  ], skippedCount: 3 });

  expect(await loadGateReport({ build: '1.0.0+1', offsetAt: () => 330 })).toEqual({
    groups: [
      { eventType: 'food_active_input', count: 0, medianMs: null, p90Ms: null },
      { eventType: 'recognition_wait', count: 0, medianMs: null, p90Ms: null, p95Ms: null },
      { eventType: 'set_logging', count: 1, medianMs: null, p90Ms: null },
      { eventType: 'unclean_exit', count: 0, medianMs: null, p90Ms: null },
    ],
    builds: [{ build: '1.0.0+1', count: 1 }, { build: '1.0.0+2', count: 1 }],
    uncleanExitCount: 0,
    dailyTotals: [{ day: '2026-11-08', totalMs: 120, count: 1 }],
    skippedCount: 3,
  });
  expect(repository.list).toHaveBeenCalledWith({ from: 0, to: now });
});

test('maps a repository failure to a typed report error and logs only the allowlisted code', async () => {
  const logged = jest.spyOn(console, 'info').mockImplementation(() => {});
  repository.list.mockRejectedValue(new Error('SQLite failed at /private/record.sqlite: sensitive row values'));
  const failure: unknown = await loadGateReport().catch((error: unknown) => error);
  expect(failure).toMatchObject({ name: 'GateReportError', code: 'reportFailed', message: 'Could not load the report. Try again.' });
  expect(failure).toBeInstanceOf(GateReportError);
  expect(failure).not.toHaveProperty('cause');
  expect(String(failure)).not.toMatch(/private|SQLite|sensitive/);
  expect(logged).toHaveBeenCalledTimes(1);
  expect(logged).toHaveBeenCalledWith('report_failed', { errorCode: 'reportFailed' });
});
