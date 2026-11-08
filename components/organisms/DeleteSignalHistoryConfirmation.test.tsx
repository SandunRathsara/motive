import { fireEvent, render, screen } from '@testing-library/react-native';
import { DeleteSignalHistoryConfirmation } from './DeleteSignalHistoryConfirmation';

test('the sheet explains local-only deletion and re-import, with explicit cancel and destructive confirmation', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(<DeleteSignalHistoryConfirmation visible signalTitle="Sleep" onConfirm={onConfirm} onCancel={onCancel} />);
  expect(screen.getByText('Apple Health keeps its own data. Turn off access in Apple Health first, otherwise the next sync reads the history again.')).toBeOnTheScreen();
  expect(screen.getByText('This deletes only the cached Sleep history in Motive.')).toBeOnTheScreen();
  expect(screen.getByTestId('delete-signal-history-sheet')).toHaveProp('presentationStyle', 'pageSheet');
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm delete signal history' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('system dismissal cancels without deleting, and a closed sheet is absent', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(<DeleteSignalHistoryConfirmation visible signalTitle="Weight" onConfirm={onConfirm} onCancel={onCancel} />);
  await fireEvent(screen.getByTestId('delete-signal-history-sheet'), 'requestClose');
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  await screen.rerender(<DeleteSignalHistoryConfirmation visible={false} signalTitle="Weight" onConfirm={onConfirm} onCancel={onCancel} />);
  expect(screen.queryByTestId('delete-signal-history-sheet')).toBeNull();
});
