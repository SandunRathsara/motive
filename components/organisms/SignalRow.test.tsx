import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SignalRowViewModel, SignalStatusViewModel } from '@/features/health/health.types';
import { SignalRow } from './SignalRow';

test.each([
  ['unavailableOnDevice', 'Unavailable on this device'],
  ['notRequested', 'Not connected to Apple Health'],
  ['hasSamples', '6 h 20 min'],
  ['noReadableSamples', 'No readable samples in this window. Check Health access and source sync.'],
  ['queryError', "Couldn't read this signal"],
] as const)('%s row announces its value or unknown, status and last sync', async (status: SignalStatusViewModel, text) => {
  const onPress = jest.fn();
  const model: SignalRowViewModel = {
    type: 'sleep', title: 'Sleep', status, statusText: status === 'hasSamples' ? 'Samples available' : text, lastSyncText: 'Last synced today at 08:12', points: [],
    value: status === 'hasSamples' ? { known: true, text } : { known: false, copy: text },
    baseline: { known: true, text: '7.1 h', coverageText: '18 of 28 days' },
  };
  await render(<SignalRow model={model} onPress={onPress} />);
  const row = screen.getByRole('button', { name: 'Sleep' });
  expect(row).toHaveAccessibilityValue({ text });
  expect(screen.getByLabelText('Sleep, 14 days, 0 of 14 known. Unknown days are gaps.')).toBeOnTheScreen();
  expect(screen.getByText('Baseline 7.1 h · 18 of 28 days')).toBeOnTheScreen();
  expect(screen.getByText('Last synced today at 08:12')).toBeOnTheScreen();
  expect(screen.queryByText(/denied|^0$/i)).toBeNull();
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a today-scoped unknown is Not yet available even when older samples exist', async () => {
  await render(<SignalRow model={{ type: 'hrv', title: 'HRV', status: 'hasSamples', statusText: 'Samples available', points: [],
    lastSyncText: 'Last synced today', value: { known: false, copy: 'Not yet available' } }} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'HRV' })).toHaveAccessibilityValue({ text: 'Not yet available' });
  expect(screen.queryByText('Older sample exists')).toBeNull();
});

test('weight shows its source, age, Trend Weight and aggregate coverage without hiding an unknown baseline', async () => {
  await render(<SignalRow model={{ type: 'bodyMass', title: 'Weight', status: 'hasSamples', statusText: 'Samples available', points: [],
    lastSyncText: 'Last synced today', value: { known: true, text: '82.4 kg', ageText: '2 days ago',
      source: { name: 'Health', userEntered: true } },
    trendWeight: { known: true, text: '82.6 kg', coverageText: '5 of 7 days' },
    baseline: { known: false, copy: 'Not enough history', coverageText: '13 of 28 days' },
  }} onPress={jest.fn()} />);
  expect(screen.getByLabelText('Health · User-entered')).toBeOnTheScreen();
  expect(screen.getByText('2 days ago')).toBeOnTheScreen();
  expect(screen.getByText('Trend Weight 82.6 kg · 5 of 7 days')).toBeOnTheScreen();
  expect(screen.getByText('Baseline Not enough history · 13 of 28 days')).toBeOnTheScreen();
});
