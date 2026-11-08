import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlaceholderTemplate } from './PlaceholderTemplate';

test('exposes the screen title and calm placeholder message', async () => {
  await render(<PlaceholderTemplate title="Today" message="Your daily overview is coming next." />);
  expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
  expect(screen.getByText('Not built yet')).toBeOnTheScreen();
  expect(screen.getByText('Your daily overview is coming next.')).toBeOnTheScreen();
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
