import { act, renderHook, waitFor } from '@testing-library/react-native';
import { getHealthSync, getTrendWeight, readHealthSnapshot, type CoveredSignalValue } from '@/features/health';
import { healthPrefillTimeoutMs } from '../services/health-prefill';
import { useHealthPrefill } from './useHealthPrefill';

jest.mock('@/features/health', () => ({ getHealthSync: jest.fn(), getTrendWeight: jest.fn(), readHealthSnapshot: jest.fn() }));
const connect = jest.fn(), sync = jest.fn();
const now = Date.now();
const known = { known: true, value: 80.5, coverage: { known: 1, of: 7, unit: 'days' }, provenance: [{ sampleTime: now - 86400000, sampleId: 'sample', userEntered: false, source: { name: 'Scale', bundleId: 'scale' } }] } satisfies CoveredSignalValue;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getHealthSync).mockReturnValue({ connect, sync, isAvailable: jest.fn(async () => true) } as never);
  jest.mocked(readHealthSnapshot).mockResolvedValue({ available: true, availability: [], samples: [] });
  connect.mockResolvedValue({ types: [] }); sync.mockResolvedValue({ types: [] });
  jest.mocked(getTrendWeight).mockResolvedValue(known);
});
test('explicit opt-in connects only when notRequested, then prefills known Trend Weight with editable provenance', async () => {
  const onKnown = jest.fn();
  const { result } = await renderHook(() => useHealthPrefill(true, onKnown));
  await waitFor(() => expect(result.current.available).toBe(true));
  expect(connect).not.toHaveBeenCalled();
  await act(() => result.current.request());
  expect(connect).toHaveBeenCalledTimes(1); expect(sync).not.toHaveBeenCalled();
  expect(onKnown).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 80.5, origin: { kind: 'health', sampleTime: known.provenance[0].sampleTime, sourceName: 'Scale' } }));
});
test('already requested refreshes without re-requesting authorization; unknown stays calm and empty', async () => {
  jest.mocked(readHealthSnapshot).mockResolvedValue({ available: true, samples: [], availability: [{ type: 'bodyMass', state: 'requested', readState: 'noReadableSamples', lastQueryAt: now, lastSampleAt: null }] });
  jest.mocked(getTrendWeight).mockResolvedValue({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  const onKnown = jest.fn();
  const { result } = await renderHook(() => useHealthPrefill(true, onKnown));
  await act(() => result.current.request());
  expect(sync).toHaveBeenCalledWith('refresh'); expect(connect).not.toHaveBeenCalled();
  expect(onKnown).not.toHaveBeenCalled(); expect(result.current.message).toMatch(/type your weight/);
  expect(result.current.message).not.toMatch(/denied|\b0\b/i);
});
test('slow sync times out, leaves typing available and ignores the late result', async () => {
  jest.useFakeTimers();
  let finish!: () => void;
  connect.mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ types: [] }); }));
  const onKnown = jest.fn();
  const { result, unmount } = await renderHook(() => useHealthPrefill(true, onKnown));
  let pending!: Promise<void>;
  await act(() => { pending = result.current.request(); });
  await act(async () => { jest.advanceTimersByTime(healthPrefillTimeoutMs); await pending; });
  expect(result.current.busy).toBe(false); expect(onKnown).not.toHaveBeenCalled();
  await act(() => finish()); expect(onKnown).not.toHaveBeenCalled();
  await unmount(); jest.useRealTimers();
});
test.each(['typed', 'left'] as const)('late results are ignored after the user %s', async (reason) => {
  let finish!: (value: typeof known) => void;
  jest.mocked(getTrendWeight).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const onKnown = jest.fn();
  const { result, rerender } = await renderHook((active: boolean) => useHealthPrefill(active, onKnown), { initialProps: true });
  let pending!: Promise<void>;
  await act(() => { pending = result.current.request(); });
  if (reason === 'typed') await act(() => result.current.cancel()); else await rerender(false);
  await act(async () => { finish(known); await pending; });
  expect(onKnown).not.toHaveBeenCalled();
});
test.each(['unavailable', 'error'] as const)('%s Health never fills a weight', async (state) => {
  jest.mocked(getHealthSync).mockReturnValue({ connect, sync, isAvailable: jest.fn(async () => false) } as never);
  if (state === 'unavailable') jest.mocked(readHealthSnapshot).mockResolvedValue({ available: false, samples: [], availability: [] });
  else jest.mocked(readHealthSnapshot).mockRejectedValue(new Error('private'));
  const onKnown = jest.fn();
  const { result } = await renderHook(() => useHealthPrefill(true, onKnown));
  await act(() => result.current.request());
  expect(result.current.available).toBe(false); expect(onKnown).not.toHaveBeenCalled();
});
