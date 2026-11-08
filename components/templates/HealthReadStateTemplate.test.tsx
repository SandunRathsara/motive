import { fireEvent, render, screen } from '@testing-library/react-native';
import { HealthReadStateTemplate } from './HealthReadStateTemplate';

test('initial loading is not an empty history and read failures offer retry with no private error details', async () => {
  const retry = jest.fn();
  await render(<HealthReadStateTemplate title="Health Signals" failed={false} onRetry={retry} />);
  expect(screen.getByText('Loading cached Health Signals…')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  await screen.rerender(<HealthReadStateTemplate title="Health Signals" failed onRetry={retry} />);
  expect(screen.getByText('Couldn’t load cached Health Signals. Your record has not been changed.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
