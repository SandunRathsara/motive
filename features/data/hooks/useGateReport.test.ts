import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { metrics, type MetricRow } from '@/features/metrics';
import { dataKeys } from './query-keys';
import { useGateReport } from './useGateReport';

jest.mock('@/features/metrics', () => ({
  metrics: { list: jest.fn() },
  metricEventTypes: ['food_active_input', 'recognition_wait', 'set_logging', 'unclean_exit'],
}));
const repository = jest.mocked(metrics);
const rows: MetricRow[] = [
  ...[100, 200, 300, 400, 500].map((duration_ms): MetricRow => ({
    id: '00000000-0000-4000-8000-000000000001', event_type: 'set_logging', duration_ms,
    build: '1.0.0+1', recorded_at: Date.UTC(2026, 10, 8, 12),
  })),
  { id: '00000000-0000-4000-8000-000000000002', event_type: 'food_active_input', duration_ms: 9000, build: '1.0.0+2', recorded_at: Date.UTC(2026, 10, 8, 12) },
  { id: '00000000-0000-4000-8000-000000000003', event_type: 'unclean_exit', duration_ms: null, build: '1.0.0+1', recorded_at: Date.UTC(2026, 10, 8, 12) },
];
const clients: QueryClient[] = [];
async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always' } } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...await renderHook(() => useGateReport(), { wrapper }) };
}
beforeEach(() => { repository.list.mockReset(); });
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); jest.restoreAllMocks(); });

test('starts loading then exposes the repository report, contributing builds and skipped count through Query', async () => {
  let finish!: (value: Awaited<ReturnType<typeof metrics.list>>) => void;
  repository.list.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result, client } = await setup();
  expect(result.current).toMatchObject({ status: 'loading', report: null, builds: [], selectedBuild: null });
  await act(() => finish({ rows, skippedCount: 2 }));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.report?.groups[2]).toEqual({ eventType: 'set_logging', count: 5, medianMs: 300, p90Ms: 500 });
  expect(result.current.report?.uncleanExitCount).toBe(1);
  expect(result.current.report?.skippedCount).toBe(2);
  expect(result.current.builds).toEqual([{ build: '1.0.0+1', count: 6 }, { build: '1.0.0+2', count: 1 }]);
  expect(client.getQueryData(dataKeys.report())).toEqual(result.current.report);
});

test('selects one build locally, keeps counts for all builds, and clears the filter with null', async () => {
  repository.list.mockResolvedValue({ rows, skippedCount: 0 });
  const { result, client } = await setup();
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(() => result.current.selectBuild('1.0.0+2'));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.selectedBuild).toBe('1.0.0+2');
  expect(result.current.report?.groups[2]).toEqual({ eventType: 'set_logging', count: 0, medianMs: null, p90Ms: null });
  expect(result.current.report?.uncleanExitCount).toBe(0);
  expect(result.current.report?.dailyTotals).toEqual([{ day: expect.any(String), totalMs: 9000, count: 1 }]);
  expect(result.current.builds).toEqual([{ build: '1.0.0+1', count: 6 }, { build: '1.0.0+2', count: 1 }]);
  expect(dataKeys.all).toEqual(['data']);
  expect(dataKeys.report()).toEqual(['data', 'report', 'all']);
  expect(dataKeys.report('1.0.0+2')).toEqual(['data', 'report', '1.0.0+2']);
  expect(client.getQueryData(['data', 'report', '1.0.0+2'])).toEqual(result.current.report);
  await act(() => result.current.selectBuild(null));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.selectedBuild).toBeNull();
  expect(result.current.report?.groups[2].count).toBe(5);
  expect(result.current.report?.uncleanExitCount).toBe(1);
  expect(client.getQueryData(['data', 'report', 'all'])).toEqual(result.current.report);
});

test('an empty successful read is ready with counted unknown statistics, not loading', async () => {
  repository.list.mockResolvedValue({ rows: [], skippedCount: 4 });
  const { result } = await setup();
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.report).toEqual({
    groups: [
      { eventType: 'food_active_input', count: 0, medianMs: null, p90Ms: null },
      { eventType: 'recognition_wait', count: 0, medianMs: null, p90Ms: null, p95Ms: null },
      { eventType: 'set_logging', count: 0, medianMs: null, p90Ms: null },
      { eventType: 'unclean_exit', count: 0, medianMs: null, p90Ms: null },
    ],
    builds: [], uncleanExitCount: 0, dailyTotals: [], skippedCount: 4,
  });
});

test('a failed read exposes a safe error state and retry loads the report without exposing the raw failure', async () => {
  const logged = jest.spyOn(console, 'info').mockImplementation(() => {});
  repository.list.mockRejectedValueOnce(new Error('private /record.sqlite sensitive values'));
  const { result } = await setup();
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current).toMatchObject({ report: null, builds: [], selectedBuild: null });
  expect(JSON.stringify(result.current)).not.toMatch(/private|record.sqlite|sensitive/);
  expect(logged).toHaveBeenCalledWith('report_failed', { errorCode: 'reportFailed' });
  repository.list.mockResolvedValue({ rows, skippedCount: 0 });
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.report?.groups[2].medianMs).toBe(300);
});

test('a refresh failure keeps the last report available with the error state', async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  repository.list.mockResolvedValueOnce({ rows, skippedCount: 0 });
  const { result } = await setup();
  await waitFor(() => expect(result.current.status).toBe('ready'));
  repository.list.mockRejectedValueOnce(new Error('read failed'));
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.report?.groups[2]).toEqual({ eventType: 'set_logging', count: 5, medianMs: 300, p90Ms: 500 });
  expect(result.current.builds).toEqual([{ build: '1.0.0+1', count: 6 }, { build: '1.0.0+2', count: 1 }]);
});
