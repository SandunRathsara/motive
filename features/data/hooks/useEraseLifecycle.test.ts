import { act, renderHook } from '@testing-library/react-native';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { eraseAll } from '../services/erase';
import { faultInjection } from '../services/fault-injection';
import { useEraseLifecycle } from './useEraseLifecycle';
import { useFaultInjection } from './useFaultInjection';

jest.mock('@/lib/build', () => ({ isVerification: true }));
jest.mock('../services/erase', () => ({ eraseAll: jest.fn(async () => ({ ok: true })) }));
const initial = useRecordLifecycle.getState();
beforeEach(() => { useRecordLifecycle.setState(initial, true); jest.clearAllMocks(); faultInjection.arm(null); });

test('the root sees erasing, blocked and retry completion even without a Settings hook', async () => {
  const { result } = await renderHook(() => useEraseLifecycle());
  expect(result.current).toMatchObject({ phase: 'ready', paused: null });
  await act(() => result.current.retry());
  expect(eraseAll).not.toHaveBeenCalled();
  await act(() => useRecordLifecycle.getState().beginErase());
  expect(result.current.phase).toBe('erasing');
  await act(() => useRecordLifecycle.getState().blockErase());
  expect(result.current.phase).toBe('erase-blocked');
  jest.mocked(eraseAll).mockImplementation(async () => {
    useRecordLifecycle.getState().beginErase();
    useRecordLifecycle.getState().completeErase();
    return { ok: true };
  });
  await act(() => result.current.retry());
  expect(result.current.phase).toBe('ready'); expect(eraseAll).toHaveBeenCalledTimes(1);
});

test('verification pause is observable without waiting for the paused operation to finish', async () => {
  const { result } = await renderHook(() => useEraseLifecycle());
  await act(() => { faultInjection.arm('afterDatabaseDeleted'); void faultInjection.pauseAt('afterDatabaseDeleted'); });
  expect(result.current.paused).toBe('afterDatabaseDeleted');
});

test('Settings observes and arms the verification-only fault switch', async () => {
  const { result } = await renderHook(() => useFaultInjection());
  expect(result.current).toMatchObject({ available: true, armed: null });
  await act(() => result.current.arm('afterDatabaseDeleted'));
  expect(result.current.armed).toBe('afterDatabaseDeleted');
  await act(() => result.current.arm('afterStaging'));
  expect(result.current.armed).toBe('afterStaging');
  await act(() => result.current.arm(null));
  expect(result.current.armed).toBeNull();
});
