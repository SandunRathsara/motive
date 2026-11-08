import { render, screen } from '@testing-library/react-native';
import { SignalSampleList } from './SignalSampleList';

test('samples are grouped by day with time, provenance and exclusion markers', async () => {
  await render(<SignalSampleList days={[
    { id: 'today', dayText: 'Today · 8 November', samples: [
      { id: 'manual-hrv', valueText: '42 ms', timeText: '08:30', source: { name: 'Health', userEntered: true }, notInBaseline: true },
      { id: 'other-sleep', valueText: '6 h', timeText: '07:15', source: { name: 'iPhone', userEntered: false }, notUsedThisNight: true },
    ] },
    { id: 'yesterday', dayText: 'Yesterday · 7 November', samples: [
      { id: 'watch', valueText: '48 ms', timeText: '09:10', source: { name: 'Apple Watch', userEntered: false } },
    ] },
  ]} />);
  expect(screen.getByRole('header', { name: 'Today · 8 November' })).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Yesterday · 7 November' })).toBeOnTheScreen();
  expect(screen.getByText('08:30')).toBeOnTheScreen();
  expect(screen.getByLabelText('Health · User-entered')).toBeOnTheScreen();
  expect(screen.getByText('Not in baseline')).toBeOnTheScreen();
  expect(screen.getByText('Not used this night')).toBeOnTheScreen();
});

test('no cached samples has an explicit, stable empty state', async () => {
  await render(<SignalSampleList days={[]} />);
  expect(screen.getByTestId('signal-history-empty')).toHaveTextContent('No cached samples for this signal.');
  expect(screen.getByLabelText('No cached samples for this signal.')).toBeOnTheScreen();
});
