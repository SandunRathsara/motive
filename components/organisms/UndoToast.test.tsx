import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { UndoToast } from './UndoToast';

const offer = { label: 'Set logged', accessibilityLabel: 'Undo. Set logged', deadlineMs: 5_000 };

let announce: jest.SpyInstance;
beforeEach(() => {
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  announce.mockClear();
});
afterEach(() => { jest.restoreAllMocks(); });

test('offers one-tap undo with no confirmation and announces the change to VoiceOver', async () => {
  const onUndo = jest.fn();
  await render(<UndoToast offer={offer} onUndo={onUndo} />);
  expect(screen.getByText('Set logged')).toBeOnTheScreen();
  expect(announce).toHaveBeenCalledWith('Set logged. Undo available.');
  await fireEvent.press(screen.getByRole('button', { name: 'Undo. Set logged' }));
  expect(onUndo).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/sure|confirm|cancel/i)).toBeNull();
});

test('the Undo target is its own labelled button, not swallowed by a group', async () => {
  await render(<UndoToast offer={{ ...offer, label: 'Session deleted', accessibilityLabel: 'Undo. Session deleted' }} onUndo={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Undo. Session deleted' })).toBeOnTheScreen();
  expect(screen.getByText('Undo')).toBeOnTheScreen();
  expect(screen.getByText('Session deleted')).toBeOnTheScreen();
});

test('announces each offer once, and again when a newer offer replaces it', async () => {
  await render(<UndoToast offer={offer} onUndo={jest.fn()} />);
  await screen.rerender(<UndoToast offer={{ ...offer }} onUndo={jest.fn()} />);
  expect(announce).toHaveBeenCalledTimes(1);
  await screen.rerender(<UndoToast offer={{ ...offer, label: 'Set deleted', accessibilityLabel: 'Undo. Set deleted', deadlineMs: 11_000 }} onUndo={jest.fn()} />);
  expect(announce).toHaveBeenCalledTimes(2);
  expect(announce).toHaveBeenLastCalledWith('Set deleted. Undo available.');
});

test('renders nothing once the offer has expired', async () => {
  const { toJSON } = await render(<UndoToast offer={null} onUndo={jest.fn()} />);
  expect(toJSON()).toBeNull();
  expect(announce).not.toHaveBeenCalled();
});

test('a failed undo is shown calmly even after the offer is gone', async () => {
  await render(<UndoToast offer={null} errorText="Not saved. Nothing was changed. Try again." onUndo={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Not saved. Nothing was changed. Try again.');
  expect(screen.queryByRole('button', { name: /Undo/ })).toBeNull();
});
