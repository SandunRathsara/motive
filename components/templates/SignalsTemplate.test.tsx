import { fireEvent, render, screen } from '@testing-library/react-native';
import type { HealthSignalType, SignalsViewModel } from '@/features/health/health.types';
import { SignalsTemplate } from './SignalsTemplate';

// The RN preset's RefreshControl mock drops all props; use the real control over its mocked native view.
jest.unmock('react-native/Libraries/Components/RefreshControl/RefreshControl');

test.each(['unavailableOnDevice', 'notRequested', 'requested'] as const)(
  'Connect Apple Health is only offered before access has been requested: %s', async (connectionState) => {
    const onConnect = jest.fn();
    const model: SignalsViewModel = { connectionState, signals: [], workouts: [], lastSyncText: 'Not synced yet' };
    await render(<SignalsTemplate model={model} refreshing={false} onRefresh={jest.fn()} onConnect={onConnect} onOpenSignal={jest.fn()} />);
    if (connectionState === 'notRequested') {
      await fireEvent.press(screen.getByRole('button', { name: 'Connect Apple Health' }));
      expect(onConnect).toHaveBeenCalledTimes(1);
    } else expect(screen.queryByRole('button', { name: 'Connect Apple Health' })).toBeNull();
  },
);

test('unavailable devices still expose all five detail rows and controlled pull to refresh', async () => {
  const onRefresh = jest.fn();
  const onOpenSignal = jest.fn();
  const titles: [HealthSignalType, string][] = [
    ['bodyMass', 'Weight'], ['sleep', 'Sleep'], ['restingHeartRate', 'Resting heart rate'], ['hrv', 'HRV'], ['workout', 'Workouts'],
  ];
  const model: SignalsViewModel = {
    connectionState: 'unavailableOnDevice', workouts: [], lastSyncText: 'Not synced yet',
    signals: titles.map(([type, title]) => ({ type, title, status: 'unavailableOnDevice', statusText: 'Unavailable on this device',
      value: { known: false, copy: 'Unavailable on this device' }, points: [], lastSyncText: 'Not synced yet' })),
  };
  await render(<SignalsTemplate model={model} refreshing onRefresh={onRefresh} onConnect={jest.fn()} onOpenSignal={onOpenSignal} />);
  for (const [type, title] of titles) {
    const row = screen.getByRole('button', { name: title });
    expect(row).toHaveAccessibilityValue({ text: 'Unavailable on this device' });
    await fireEvent.press(row);
    expect(onOpenSignal).toHaveBeenLastCalledWith(type);
  }
  const refresh = screen.getByTestId('signals-refresh-control');
  expect(refresh).toHaveProp('refreshing', true);
  await fireEvent(refresh, 'refresh');
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test('Connect progress disables repeats and sync feedback coexists with cached content', async () => {
  await render(<SignalsTemplate model={{ connectionState: 'notRequested', signals: [], workouts: [], lastSyncText: 'Last synced yesterday' }}
    refreshing={false} connecting feedbackText="Couldn’t refresh. Cached history is still available."
    onRefresh={jest.fn()} onConnect={jest.fn()} onOpenSignal={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Connecting Apple Health…' })).toBeDisabled();
  expect(screen.getByText('Couldn’t refresh. Cached history is still available.')).toBeOnTheScreen();
  expect(screen.getByText('Last synced yesterday')).toBeOnTheScreen();
});
