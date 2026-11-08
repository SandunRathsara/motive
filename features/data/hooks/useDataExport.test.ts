import { createElement, type PropsWithChildren } from 'react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { queryClient } from '@/lib/query/client';
import { exportService } from '../services/export';
import { useDataExport } from './useDataExport';

jest.mock('../services/export', () => ({ exportService: { export: jest.fn() } }));
const service = jest.mocked(exportService);
let client: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  const defaults = queryClient.getDefaultOptions();
  client = new QueryClient({ defaultOptions: { ...defaults, mutations: { ...defaults.mutations, gcTime: Infinity } } });
  service.export.mockResolvedValue({ ok: true, skippedCount: 3, skippedRowCounts: { gateMetrics: 3 } });
});
afterEach(() => { onlineManager.setOnline(true); client.clear(); });

function setup() {
  return renderHook(() => useDataExport(), {
    wrapper: ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client }, children),
  });
}

test('export requires the warning and confirmation; cancel and dismiss do not share anything', async () => {
  const { result } = await setup();
  expect(result.current.step).toBe('idle');
  await act(() => result.current.confirm());
  expect(service.export).not.toHaveBeenCalled();
  await act(() => result.current.begin());
  expect(result.current.step).toBe('warning');
  await act(() => result.current.cancel());
  expect(result.current.step).toBe('idle');
  expect(service.export).not.toHaveBeenCalled();
  await act(() => result.current.begin());
  await act(() => result.current.confirm());
  expect(result.current).toMatchObject({ step: 'done', skippedCount: 3 });
  expect(service.export).toHaveBeenCalledTimes(1);
  await act(() => result.current.dismiss());
  expect(result.current.step).toBe('idle');
});

test.each([
  ['storageFull', 'There isn’t enough free space on this iPhone to create the export. Nothing was shared.'],
  ['writeFailed', 'Couldn’t create the export file. Nothing was shared. Try again.'],
  ['validationFailed', 'Couldn’t prepare a valid export. Nothing was shared. Try again.'],
  ['cancelled', 'The export was cancelled. Nothing was shared.'],
  ['sharingUnavailable', 'Sharing isn’t available on this iPhone. Nothing was shared. Try again.'],
  ['shareFailed', 'Couldn’t open or finish sharing the export. Nothing was shared. Try again.'],
  ['busy', 'Another data operation is still running. Nothing was shared. Try again when it finishes.'],
] as const)('%s shows a plain reason and only an explicit Retry runs again', async (code, reason) => {
  service.export.mockResolvedValueOnce({ ok: false, code });
  const { result } = await setup();
  await act(() => result.current.begin());
  await act(() => result.current.confirm());
  expect(result.current).toMatchObject({ step: 'failed', code, reason });
  expect(service.export).toHaveBeenCalledTimes(1);
  await act(() => result.current.retry());
  expect(result.current).toMatchObject({ step: 'done', skippedCount: 3 });
  expect(service.export).toHaveBeenCalledTimes(2);
});

test('exporting is visible and rapid confirms, cancel, dismiss and begin cannot interrupt the sheet', async () => {
  let finish!: (value: Awaited<ReturnType<typeof exportService.export>>) => void;
  service.export.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = await setup();
  await act(() => result.current.begin());
  let pending: Promise<void> | undefined;
  await act(() => { pending = result.current.confirm(); void result.current.confirm(); });
  expect(result.current.step).toBe('exporting');
  await act(() => { result.current.cancel(); result.current.dismiss(); result.current.begin(); });
  expect(result.current.step).toBe('exporting');
  expect(service.export).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ ok: true, skippedCount: 0, skippedRowCounts: { gateMetrics: 0 } }); await pending; });
  await waitFor(() => expect(result.current).toMatchObject({ step: 'done', skippedCount: 0 }));
});

test('retry is ignored without a failure and a new export requires its warning again', async () => {
  const { result } = await setup();
  await act(() => result.current.retry());
  expect(service.export).not.toHaveBeenCalled();
  await act(() => result.current.begin());
  await act(() => result.current.confirm());
  await act(() => result.current.confirm());
  await act(() => result.current.retry());
  expect(service.export).toHaveBeenCalledTimes(1);
  await act(() => result.current.begin());
  expect(result.current.step).toBe('warning');
  await act(() => result.current.dismiss());
  await act(() => result.current.confirm());
  expect(result.current.step).toBe('idle');
  expect(service.export).toHaveBeenCalledTimes(1);
});

test('the shared mutation defaults allow export in airplane mode', async () => {
  onlineManager.setOnline(false);
  const { result } = await setup();
  await act(() => result.current.begin());
  await act(() => result.current.confirm());
  expect(result.current).toMatchObject({ step: 'done', skippedCount: 3 });
  expect(service.export).toHaveBeenCalledTimes(1);
});

test('unexpected service errors expose no private details and can be retried', async () => {
  service.export.mockRejectedValueOnce(new Error('private /record.sqlite with health values'));
  const { result } = await setup();
  await act(() => result.current.begin());
  await act(() => result.current.confirm());
  expect(result.current).toMatchObject({ step: 'failed', code: 'writeFailed', reason: 'Couldn’t create the export file. Nothing was shared. Try again.' });
  expect(JSON.stringify(result.current)).not.toMatch(/private|record.sqlite|health values/);
  await act(() => result.current.retry());
  expect(result.current.step).toBe('done');
});
