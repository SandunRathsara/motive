import { createElement, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { requireRecord, type SqlExecutor } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { queryClient } from '@/lib/query/client';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { FakeHealthKitAdapter } from '../services/fake-healthkit';
import { healthEraseParticipant, setActiveHealthSync } from '../services/erase-participant';
import { createHealthSync, type HealthSync } from '../services/health-sync';
import type { HealthSampleDto } from '../health.schemas';
import { useSignals } from './useSignals';
import { useConnectHealth } from './useConnectHealth';
import { useSignalDetail } from './useSignalDetail';
import { useHealthRefresh } from './useHealthRefresh';
import { useDeleteSignalHistory } from './useDeleteSignalHistory';
import { useTodayTrendLine } from './useTodayTrendLine';
import { useHealthSyncOnOpen } from './useHealthSyncOnOpen';
import { AppState, type AppStateStatus } from 'react-native';
import { getHealthSync, refreshOnOpenAttempted } from '../services/health';

jest.mock('@/lib/persistence', () => ({ ...jest.requireActual('@/lib/persistence'), requireRecord: jest.fn() }));
const now = Date.parse('2026-11-08T12:00:00Z');
let db: SqlExecutor;
let adapter: FakeHealthKitAdapter;
let sync: HealthSync;
const defaults = queryClient.getDefaultOptions();
const weight = (value = 80): HealthSampleDto => ({
  uuid: '00000000-0000-4000-8000-000000000001', type: 'bodyMass', value, unit: 'kg',
  startMs: now - 3_600_000, endMs: now - 3_600_000,
  source: { bundleId: 'scale', name: 'Scale' }, sourceRevision: {}, device: null, userEntered: false,
});

test('refresh progress belongs to the mutation, query failure keeps cached history, and unavailable devices work before any sync', async () => {
  adapter.available = false;
  const { result } = await renderHook(() => ({ detail: useSignalDetail('bodyMass'), refresh: useHealthRefresh() }), { wrapper });
  await waitFor(() => expect(result.current.detail.data?.status).toBe('unavailableOnDevice'));
  adapter.available = true;
  adapter.authorizationRequested = true;
  adapter.addSample(weight());
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => { await gate; return fetch(type, input); };
  let pending: Promise<unknown>;
  await act(() => { pending = result.current.refresh.mutateAsync(); });
  await waitFor(() => expect(result.current.refresh.isPending).toBe(true));
  await act(async () => { release(); await pending; });
  await waitFor(() => expect(result.current.detail.data?.days[0].samples[0].valueText).toBe('80 kg'));
  adapter.queryFailures.bodyMass = true;
  await act(() => result.current.refresh.mutateAsync());
  await waitFor(() => expect(result.current.detail.data).toMatchObject({ status: 'queryError', value: { known: true, text: '80 kg' } }));
  expect(result.current.refresh.errorText).toBe("Couldn't refresh every signal. Your cached history is still available. Pull to refresh to try again.");
});

test('history deletion invalidates list and detail, and blocked deletion leaves visible history with a retryable error', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight());
  await sync.sync('open');
  const { result } = await renderHook(() => ({ signals: useSignals(), detail: useSignalDetail('bodyMass'), deletion: useDeleteSignalHistory('bodyMass') }), { wrapper });
  await waitFor(() => expect(result.current.detail.data?.days).toHaveLength(1));
  useRecordLifecycle.setState({ phase: 'erasing' });
  await act(() => result.current.deletion.mutateAsync());
  expect(result.current.deletion.errorText).toBe("Couldn't delete this signal's history. Try again when the record is ready.");
  expect(result.current.detail.data?.days).toHaveLength(1);
  useRecordLifecycle.setState({ phase: 'ready' });
  await act(() => result.current.deletion.mutateAsync());
  await waitFor(() => expect(result.current.detail.data?.days).toEqual([]));
  expect(result.current.signals.data?.signals[0].trendWeight).toMatchObject({ known: false, coverageText: '0 of 7 days' });
  expect(result.current.deletion.errorText).toBeUndefined();
});

test('Today is null without a deviation and a post-commit sync makes exactly one eligible trend available', async () => {
  adapter.authorizationRequested = true;
  const { result } = await renderHook(() => useTodayTrendLine(), { wrapper });
  await waitFor(() => expect(result.current.data).toBeNull());
  for (let index = 0; index < 35; index++) {
    const endMs = Date.parse('2026-10-05T07:00:00Z') + index * 86_400_000;
    adapter.addSample({ sourceRevision: {}, userEntered: false, uuid: `00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
      type: 'sleep', stage: 'asleepCore', startMs: endMs - (index < 28 ? 8 : 7) * 3_600_000, endMs,
      source: { bundleId: 'watch', name: 'Watch' }, device: { model: 'Watch' } });
  }
  await act(() => sync.sync('open'));
  await waitFor(() => expect(result.current.data).toMatchObject({ type: 'sleep', text: 'Sleep 60 min below baseline · 7 of 7 nights · baseline 28 of 28 nights' }));
});
const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: queryClient }, children);
beforeEach(async () => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { ...defaults.queries, gcTime: Infinity }, mutations: { ...defaults.mutations, gcTime: Infinity } });
  useRecordLifecycle.setState({ phase: 'ready' });
  db = nodeExecutor();
  await migrateRecord(db, async () => {});
  jest.mocked(requireRecord).mockReturnValue(db);
  adapter = new FakeHealthKitAdapter();
  sync = createHealthSync({ adapter, connection: db, now: () => Date.now() });
  setActiveHealthSync(sync);
});
afterEach(async () => {
  await cleanup();
  await healthEraseParticipant.reset();
  queryClient.clear();
  queryClient.setDefaultOptions(defaults);
  await db.close();
  onlineManager.setOnline(true);
  useRecordLifecycle.setState({ phase: 'ready' });
  jest.restoreAllMocks();
});

test('never-synced types are notRequested; connecting and post-commit corrections update visible Query data offline', async () => {
  onlineManager.setOnline(false);
  adapter.addSample(weight());
  const { result } = await renderHook(() => ({ signals: useSignals(), connect: useConnectHealth() }), { wrapper });
  await waitFor(() => expect(result.current.signals.data?.signals.every((row) => row.status === 'notRequested')).toBe(true));
  await act(() => result.current.connect.mutateAsync());
  await waitFor(() => expect(result.current.signals.data?.signals[0].value).toMatchObject({ known: true, text: '80 kg' }));
  adapter.editSample(weight(82));
  await act(() => sync.sync('refresh'));
  await waitFor(() => expect(result.current.signals.data?.signals[0].value).toMatchObject({ text: '82 kg' }));
});

test('open sync never holds rendering, waits for readiness, and repeats only on a return to foreground', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight());
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  let onChange!: (state: AppStateStatus) => void;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { onChange = listener; return { remove: () => {} }; });
  const { result, rerender } = await renderHook(({ enabled }: { enabled: boolean }) => {
    useHealthSyncOnOpen(enabled);
    return { rendered: true, signals: useSignals() };
  }, { wrapper, initialProps: { enabled: false } });
  await waitFor(() => expect(result.current.signals.data?.signals[0].status).toBe('notRequested'));
  await expect(refreshOnOpenAttempted()).resolves.toBeUndefined();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => { await gate; return fetch(type, input); };
  await rerender({ enabled: true });
  let attempted = false;
  void refreshOnOpenAttempted().then(() => { attempted = true; });
  await Promise.resolve();
  expect(result.current.rendered).toBe(true);
  expect(attempted).toBe(false);
  await act(async () => { release(); await refreshOnOpenAttempted(); });
  await waitFor(() => expect(result.current.signals.data?.signals[0].value).toMatchObject({ text: '80 kg' }));
  adapter.editSample(weight(81));
  await act(() => onChange('active'));
  expect(result.current.signals.data?.signals[0].value).toMatchObject({ text: '80 kg' });
  await act(() => onChange('background'));
  await act(() => onChange('active'));
  await waitFor(() => expect(result.current.signals.data?.signals[0].value).toMatchObject({ text: '81 kg' }));
  AppState.currentState = originalState;
});

test('erase drops the singleton and its subscribers; the next record lazily receives a fresh registered service', async () => {
  expect(getHealthSync()).toBe(sync);
  await healthEraseParticipant.quiesce();
  await healthEraseParticipant.reset();
  expect(await healthEraseParticipant.isClear()).toBe(true);
  const fresh = getHealthSync();
  expect(fresh).not.toBe(sync);
  expect(getHealthSync()).toBe(fresh);
  expect(await healthEraseParticipant.isClear()).toBe(false);
  await expect(sync.sync('refresh')).resolves.toMatchObject({ error: { kind: 'stopped' } });
  await fresh.sync('open');
  await expect(refreshOnOpenAttempted()).resolves.toBeUndefined();
});

test('a failed record read is retryable, and a failed Connect does not fabricate samples or discard the record', async () => {
  jest.mocked(requireRecord).mockImplementationOnce(() => { throw new Error('private storage error'); });
  const { result } = await renderHook(() => ({ signals: useSignals(), connect: useConnectHealth() }), { wrapper });
  await waitFor(() => expect(result.current.signals.isError).toBe(true));
  expect(result.current.signals.error).toMatchObject({ kind: 'readFailed', message: "Couldn't read cached Health Signals. Try again." });
  expect(result.current.signals.data).toBeUndefined();
  await act(() => result.current.signals.refetch());
  await waitFor(() => expect(result.current.signals.isSuccess).toBe(true));
  adapter.requestReadAuthorization = async () => { throw new Error('private Health access failure'); };
  await act(() => result.current.connect.mutateAsync());
  await waitFor(() => expect(result.current.connect.errorText).toBe("Couldn't connect every signal. Check Health access and source sync, then try again."));
  expect(result.current.signals.data?.signals[0].value.known).toBe(false);
});

test('foreground reads age cached windows immediately, even while the new native read is still pending', async () => {
  adapter.authorizationRequested = true;
  adapter.addSample(weight());
  await sync.sync('open');
  AppState.currentState = 'active';
  let onChange!: (state: AppStateStatus) => void;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => { onChange = listener; return { remove: () => {} }; });
  const { result } = await renderHook(() => { useHealthSyncOnOpen(true); return useSignals(); }, { wrapper });
  await waitFor(() => expect(result.current.data?.signals[0].trendWeight?.known).toBe(true));
  await sync.sync('open');
  jest.mocked(Date.now).mockReturnValue(now + 8 * 86_400_000);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetch = adapter.anchoredFetch.bind(adapter);
  adapter.anchoredFetch = async (type, input) => { await gate; return fetch(type, input); };
  await act(() => onChange('background'));
  await act(() => onChange('active'));
  await waitFor(() => expect(result.current.data?.signals[0].trendWeight).toMatchObject({ known: false, coverageText: '0 of 7 days' }));
  expect(result.current.data?.signals[0].value).toMatchObject({ known: true, ageText: 'Stale · 8 days ago' });
  await act(async () => { release(); await sync.sync('open'); });
});
