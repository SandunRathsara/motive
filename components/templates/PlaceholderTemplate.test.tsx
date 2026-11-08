import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlaceholderTemplate } from './PlaceholderTemplate';
import { TodayTrendLine } from '@/components/organisms/TodayTrendLine';

test('exposes the screen title and calm placeholder message', async () => {
  await render(<PlaceholderTemplate title="Today" message="Your daily overview is coming next." />);
  expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
  expect(screen.getByText('Not built yet')).toBeOnTheScreen();
  expect(screen.getByText('Your daily overview is coming next.')).toBeOnTheScreen();
});

test('Today accepts a tappable trend slot without replacing the placeholder and hides a null candidate', async () => {
  const open = jest.fn();
  await render(<PlaceholderTemplate title="Today" message="Your daily overview is coming next."
    trendLine={<TodayTrendLine candidate={{ type: 'sleep', text: 'Sleep below baseline · 5 of 7 nights' }} onPress={open} />} />);
  await fireEvent.press(screen.getByTestId('today-trend-line'));
  expect(open).toHaveBeenCalledWith('sleep');
  expect(screen.getByText('Your daily overview is coming next.')).toBeOnTheScreen();
  await screen.rerender(<PlaceholderTemplate title="Today" message="Your daily overview is coming next."
    trendLine={<TodayTrendLine candidate={null} onPress={open} />} />);
  expect(screen.queryByTestId('today-trend-line')).toBeNull();
});

test('Today can open Settings from an accessible header avatar without changing its placeholder', async () => {
  const onOpenSettings = jest.fn();
  await render(<PlaceholderTemplate title="Today" message="Your daily overview is coming next." onOpenSettings={onOpenSettings} />);
  expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
  expect(screen.getByText('Your daily overview is coming next.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeEnabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
  expect(onOpenSettings).toHaveBeenCalledTimes(1);
  await screen.rerender(<PlaceholderTemplate title="Train" message="Training placeholder" />);
  expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
});
