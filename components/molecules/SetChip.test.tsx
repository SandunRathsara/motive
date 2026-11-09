import { fireEvent, render, screen } from '@testing-library/react-native';
import { SetChip } from './SetChip';

test('recommended chip logs on one tap and carries the VoiceOver label', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={80} reps={9} recommended onPress={onPress} />);
  const chip = screen.getByRole('button', { name: '80 kilograms, 9 reps, recommended' });
  expect(screen.getByText('80 × 9')).toBeOnTheScreen();
  await fireEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('shows last session as secondary text and announces it as a hint', async () => {
  await render(<SetChip loadKg={82.5} reps={6} recommended last={{ loadKg: 80, reps: 9 }} onPress={jest.fn()} />);
  expect(screen.getByText('last 80 × 9')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '82.5 kilograms, 6 reps, recommended' }))
    .toHaveProp('accessibilityHint', 'Last session 80 kilograms, 9 reps. Logs this set.');
});

test('first session without a load cannot be logged until a load is set', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={null} reps={6} recommended={false} onPress={onPress} />);
  const chip = screen.getByRole('button', { name: 'Load not set, 6 reps' });
  expect(screen.getByText('— × 6')).toBeOnTheScreen();
  expect(screen.getByText('Set a load')).toBeOnTheScreen();
  expect(chip).toBeDisabled();
  await fireEvent.press(chip);
  expect(onPress).not.toHaveBeenCalled();
  await screen.rerender(<SetChip loadKg={60} reps={6} recommended={false} onPress={onPress} />);
  expect(screen.getByRole('button', { name: '60 kilograms, 6 reps' })).toBeEnabled();
});

test('bodyweight chip is reps only', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={null} bodyweight reps={12} recommended last={{ loadKg: null, reps: 10 }} onPress={onPress} />);
  expect(screen.getByText('12 reps')).toBeOnTheScreen();
  expect(screen.getByText('last 10 reps')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '12 reps, bodyweight, recommended' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('saving state is stated in text and blocks a second tap', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={80} reps={9} recommended saveState="saving" onPress={onPress} />);
  const chip = screen.getByRole('button', { name: '80 kilograms, 9 reps, recommended, saving' });
  expect(screen.getByText('Saving…')).toBeOnTheScreen();
  expect(chip).toBeDisabled();
  await fireEvent.press(chip);
  expect(onPress).not.toHaveBeenCalled();
});

test('saved state is labelled and not logged twice', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={80} reps={9} recommended saveState="saved" onPress={onPress} />);
  const chip = screen.getByRole('button', { name: '80 kilograms, 9 reps, recommended, saved' });
  expect(screen.getByText('✓ Saved')).toBeOnTheScreen();
  expect(chip).toBeDisabled();
  await fireEvent.press(chip);
  expect(onPress).not.toHaveBeenCalled();
});

test('failed commit says not saved and retries on tap', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={80} reps={9} recommended saveState="failed" onPress={onPress} />);
  const chip = screen.getByRole('button', { name: '80 kilograms, 9 reps, recommended, not saved' });
  expect(screen.getByText('Not saved. Tap to retry')).toBeOnTheScreen();
  expect(screen.queryByText(/✓ Saved/)).toBeNull();
  await fireEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('chip can be disabled by the parent', async () => {
  const onPress = jest.fn();
  await render(<SetChip loadKg={80} reps={9} recommended disabled onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button'));
  expect(onPress).not.toHaveBeenCalled();
});
