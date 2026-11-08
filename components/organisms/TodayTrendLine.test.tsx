import { fireEvent, render, screen } from '@testing-library/react-native';
import { TodayTrendLine } from './TodayTrendLine';

test.each(['unavailableOnDevice', 'notRequested', 'hasSamples', 'noReadableSamples', 'queryError'] as const)(
  '%s renders only a supplied candidate, with an accessible detail action', async (status) => {
    const onPress = jest.fn();
    const candidate = status === 'hasSamples'
      ? { type: 'sleep' as const, text: 'Sleep is 42 min under your usual · 5 of 7 nights' } : null;
    await render(<TodayTrendLine candidate={candidate} onPress={onPress} />);
    if (!candidate) {
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.toJSON()).toBeNull();
      return;
    }
    const line = screen.getByRole('button', { name: 'Sleep is 42 min under your usual · 5 of 7 nights' });
    expect(line).toHaveProp('accessibilityHint', 'Opens signal detail');
    await fireEvent.press(line);
    expect(onPress).toHaveBeenCalledWith('sleep');
    expect(screen.queryByText(/score|readiness/i)).toBeNull();
  },
);

test('only supplied unusual-source and stale-age context is shown', async () => {
  const candidate = { type: 'hrv' as const, text: 'HRV is 12% under your usual · 4 of 7 days',
    sourceLabel: 'Other wearable', staleAgeText: 'Last sample 8 days ago' };
  await render(<TodayTrendLine candidate={candidate} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'HRV is 12% under your usual · 4 of 7 days · Other wearable · Last sample 8 days ago' })).toBeOnTheScreen();
});
