import { act, renderHook, waitFor } from '@testing-library/react-native';
import { isHealthAvailableForPrefill, requestWeightForPrefill, type CoveredSignalValue } from '@/features/health';
import { healthPrefillTimeoutMs } from '../services/health-prefill';
import { useHealthPrefill } from './useHealthPrefill';

jest.mock('@/features/health', () => ({ isHealthAvailableForPrefill: jest.fn(), requestWeightForPrefill: jest.fn() }));
const now = Date.now();
const known = { known: true, value: 80.5, coverage: { known: 1, of: 7, unit: 'days' }, provenance: [{ sampleTime: now - 86400000, sampleId: 'sample', userEntered: false, source: { name: 'Scale', bundleId: 'scale' } }] } satisfies CoveredSignalValue;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isHealthAvailableForPrefill).mockResolvedValue(true);
  jest.mocked(requestWeightForPrefill).mockResolvedValue(known);
});
test('only explicit opt-in requests prefill and applies known Trend Weight with editable provenance', async () => {
  const onKnown = jest.fn();
  const { result } = await renderHook(() => useHealthPrefill(true, onKnown));
  await waitFor(() => expect(result.current.available).toBe(true));
  expect(requestWeightForPrefill).not.toHaveBeenCalled();
  await act(() => result.current.request());
  expect(requestWeightForPrefill).toHaveBeenCalledTimes(1);
  expect(onKnown).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 80.5, origin: { kind: 'health', sampleTime: known.provenance[0].sampleTime, sourceName: 'Scale' } }));
});
test('unknown Trend Weight stays calm and empty', async () => {
  jest.mocked(requestWeightForPrefill).mockResolvedValue({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  const onKnown = jest.fn();
  const { result } = await renderHook(() => useHealthPrefill(true, onKnown));
  await act(() => result.current.request());
  expect(onKnown).not.toHaveBeenCalled(); expect(result.current.message).toMatch(/type your weight/);
  expect(result.current.message).not.toMatch(/denied|\b0\b/i);
});
test('slow sync times out, leaves typing available and ignores the late result', async () => {
  jest.useFakeTimers();
  let finish!: () => void;
  jest.mocked(requestWeightForPrefill).mockImplementation(() => new Promise((resolve) => { finish = () => resolve(known); }));
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
  jest.mocked(requestWeightForPrefill).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const onKnown = jest.fn();
  const { result, rerender } = await renderHook((active: boolean) => useHealthPrefill(active, onKnown), { initialProps: true });
  let pending!: Promise<void>;
  await act(() => { pending = result.current.request(); });
  if (reason === 'typed') await act(() => result.current.cancel()); else await rerender(false);
  await act(async () => { finish(known); await pending; });
  expect(onKnown).not.toHaveBeenCalled();
});
test.each(['unavailable', 'error'] as const)('%s Health never fills a weight', async (state) => {
  jest.mocked(isHealthAvailableForPrefill).mockResolvedValue(false);
  if (state === 'unavailable') jest.mocked(requestWeightForPrefill).mockResolvedValue(null);
  else jest.mocked(requestWeightForPrefill).mockRejectedValue(new Error('private'));
  const onKnown = jest.fn();
  const { result } = await renderHook(() => useHealthPrefill(true, onKnown));
  await act(() => result.current.request());
  expect(result.current.available).toBe(false); expect(onKnown).not.toHaveBeenCalled();
});
