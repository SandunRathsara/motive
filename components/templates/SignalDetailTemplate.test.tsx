import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SignalDetailViewModel } from '@/features/health/health.types';
import { SignalDetailTemplate } from './SignalDetailTemplate';

const model: SignalDetailViewModel = {
  type: 'sleep', title: 'Sleep', status: 'hasSamples', statusText: 'Samples available', lastSyncText: 'Last synced today at 08:12',
  value: { known: false, copy: 'Not yet available' },
  days: [{ id: 'yesterday', dayText: 'Yesterday', samples: [
    { id: 'sample-1', valueText: '6 h 20 min', timeText: 'Yesterday at 07:30', source: { name: 'Apple Watch', userEntered: false } },
  ] }],
};

test('detail keeps today unknown while showing earlier samples and last sync', async () => {
  await render(<SignalDetailTemplate model={model} onDeleteHistory={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'Sleep' })).toBeOnTheScreen();
  expect(screen.getByText('Not yet available')).toBeOnTheScreen();
  expect(screen.getByText('6 h 20 min')).toBeOnTheScreen();
  expect(screen.getByLabelText('Apple Watch')).toBeOnTheScreen();
  expect(screen.getByText('Last synced today at 08:12')).toBeOnTheScreen();
});

test('a read refresh error preserves visible history and offers retry', async () => {
  const retry = jest.fn();
  await render(<SignalDetailTemplate model={model} onDeleteHistory={jest.fn()} readFailed onRetry={retry} />);
  expect(screen.getByText('Couldn’t refresh cached history. Showing the last loaded samples.')).toBeOnTheScreen();
  expect(screen.getByText('6 h 20 min')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test('deletion requires confirmation, and only a changed model clears cached samples', async () => {
  const onDeleteHistory = jest.fn();
  await render(<SignalDetailTemplate model={model} onDeleteHistory={onDeleteHistory} />);
  await fireEvent.press(screen.getByRole('button', { name: "Delete this signal's history" }));
  expect(onDeleteHistory).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByTestId('delete-signal-history-sheet')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: "Delete this signal's history" }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm delete signal history' }));
  expect(onDeleteHistory).toHaveBeenCalledTimes(1);
  expect(screen.getByText('6 h 20 min')).toBeOnTheScreen();
  await screen.rerender(<SignalDetailTemplate model={{ ...model, days: [], status: 'noReadableSamples', statusText: 'No readable samples in this window. Check Health access and source sync.',
    value: { known: false, copy: 'No cached value' } }} onDeleteHistory={onDeleteHistory} />);
  expect(screen.getByText('No cached samples for this signal.')).toBeOnTheScreen();
  expect(screen.queryByText('6 h 20 min')).toBeNull();
});

test('a pending delete cannot be repeated, and a failed delete keeps the record visible with calm copy', async () => {
  await render(<SignalDetailTemplate model={{ ...model, deleting: true }} onDeleteHistory={jest.fn()} />);
  expect(screen.getByRole('button', { name: "Delete this signal's history" })).toBeDisabled();
  expect(screen.getByText('Deleting cached history…')).toBeOnTheScreen();
  await screen.rerender(<SignalDetailTemplate model={{ ...model, deleteErrorText: "Couldn't delete this history. Try again." }} onDeleteHistory={jest.fn()} />);
  expect(screen.getByText("Couldn't delete this history. Try again.")).toBeOnTheScreen();
  expect(screen.getByText('6 h 20 min')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: "Delete this signal's history" })).toBeEnabled();
});
