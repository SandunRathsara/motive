import { render, screen } from '@testing-library/react-native';
import { PlaceholderTemplate } from './PlaceholderTemplate';

test('exposes the screen title and calm placeholder message', async () => {
  await render(<PlaceholderTemplate title="Today" message="Your daily overview is coming next." />);
  expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
  expect(screen.getByText('Not built yet')).toBeOnTheScreen();
  expect(screen.getByText('Your daily overview is coming next.')).toBeOnTheScreen();
});
