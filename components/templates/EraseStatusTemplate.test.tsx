import { fireEvent, render, screen } from '@testing-library/react-native';
import { EraseStatusTemplate } from './EraseStatusTemplate';

test('deletion blocks the app without offering cancellation or premature success', async () => {
  await render(<EraseStatusTemplate phase="erasing" paused={null} onRetry={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'Deleting your data…' })).toBeOnTheScreen();
  expect(screen.getByText('Motive is removing its data from this device. Please keep the app open.')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
  await screen.rerender(<EraseStatusTemplate phase="erasing" paused="afterDatabaseDeleted" onRetry={jest.fn()} />);
  expect(screen.getByText('Paused for verification after the database is deleted. Force-quit Motive now.')).toBeOnTheScreen();
});

test('unfinished deletion keeps the record closed and offers Retry only', async () => {
  const onRetry = jest.fn();
  await render(<EraseStatusTemplate phase="erase-blocked" paused={null} onRetry={onRetry} />);
  expect(screen.getByRole('header', { name: 'Deletion not finished' })).toBeOnTheScreen();
  expect(screen.getByText('Motive couldn’t finish deleting its data. Your record stays closed until deletion is verified. Retry to finish.')).toBeOnTheScreen();
  expect(screen.getAllByRole('button')).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
