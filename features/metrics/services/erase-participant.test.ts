import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { launchSentinel } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { useUncleanExitTracking } from '../hooks/useUncleanExitTracking';
import { metrics } from './metrics';
import { metricsEraseParticipant } from './erase-participant';

jest.mock('@/lib/persistence', () => ({ launchSentinel: { read: jest.fn(), write: jest.fn(), clear: jest.fn() } }));
jest.mock('./metrics', () => ({ metrics: { record: jest.fn(async () => {}) } }));
const initial = useRecordLifecycle.getState();
let change: (state: AppStateStatus) => void;
beforeEach(async () => {
  useRecordLifecycle.setState(initial, true); jest.clearAllMocks();
  await metricsEraseParticipant.reset();
  jest.mocked(launchSentinel.read).mockResolvedValue(null);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    change = listener; return { remove: jest.fn() };
  });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
});
afterEach(async () => { await metricsEraseParticipant.quiesce(); await metricsEraseParticipant.reset(); jest.restoreAllMocks(); });

test('quiesce drains an in-flight sentinel write and refuses old listeners; reset enables fresh-launch recovery', async () => {
  let finish!: () => void;
  jest.mocked(launchSentinel.write).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const { unmount } = await renderHook(() => useUncleanExitTracking(true));
  await act(async () => { await Promise.resolve(); });
  expect(launchSentinel.write).toHaveBeenCalledTimes(1);
  expect(await metricsEraseParticipant.isClear()).toBe(false);
  useRecordLifecycle.getState().beginErase();
  let drained = false;
  const draining = metricsEraseParticipant.quiesce().then(() => { drained = true; });
  await act(async () => { change('active'); await Promise.resolve(); });
  expect(drained).toBe(false);
  await act(async () => { finish(); await draining; });
  await metricsEraseParticipant.reset();
  expect(await metricsEraseParticipant.isClear()).toBe(true);
  await act(async () => { change('active'); });
  expect(launchSentinel.write).toHaveBeenCalledTimes(1);
  await unmount();
  useRecordLifecycle.getState().completeErase();
  jest.mocked(launchSentinel.read).mockResolvedValue('previous-build');
  await renderHook(() => useUncleanExitTracking(true));
  await act(async () => { await Promise.resolve(); });
  expect(launchSentinel.read).toHaveBeenCalledTimes(2);
  expect(metrics.record).toHaveBeenCalledWith({ event_type: 'unclean_exit' }, 'previous-build');
});

test('a subscription requested while writes are blocked cannot create a sentinel', async () => {
  useRecordLifecycle.getState().beginErase();
  await renderHook(() => useUncleanExitTracking(true));
  await act(async () => { await Promise.resolve(); });
  expect(launchSentinel.read).not.toHaveBeenCalled();
  expect(launchSentinel.write).not.toHaveBeenCalled();
  expect(await metricsEraseParticipant.isClear()).toBe(true);
});
