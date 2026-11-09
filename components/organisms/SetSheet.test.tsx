import { fireEvent, render, screen } from '@testing-library/react-native';
import { SetSheet } from './SetSheet';
import { sheetModel } from './__fixtures__/session';

const handlers = () => ({ onSave: jest.fn(), onDelete: jest.fn(), onClose: jest.fn() });

test('an unlogged set logs with one tap on the values shown', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel()} {...h} />);
  expect(screen.getByRole('header', { name: 'Back Squat · Set 2' })).toBeOnTheScreen();
  expect(screen.getByRole('adjustable', { name: 'Load' })).toHaveProp('accessibilityValue', { text: '80 kilograms' });
  expect(screen.getByRole('adjustable', { name: 'Reps' })).toHaveProp('accessibilityValue', { text: '9 reps' });
  expect(screen.queryByRole('button', { name: 'Delete set' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Log set' }));
  expect(h.onSave).toHaveBeenCalledWith({ loadKg: 80, reps: 9, type: 'working' });
});

test('stepper changes are collected and committed once, as one edit', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel({ setId: 'set-2', isSaved: true, canDelete: true })} {...h} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease reps by 1 rep' }));
  expect(h.onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('adjustable', { name: 'Load' })).toHaveProp('accessibilityValue', { text: '85 kilograms' });
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(h.onSave).toHaveBeenCalledTimes(1);
  expect(h.onSave).toHaveBeenCalledWith({ loadKg: 85, reps: 8, type: 'working' });
});

test('a saved set can be deleted in one tap with no confirmation dialog', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel({ setId: 'set-2', isSaved: true, canDelete: true })} {...h} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete set' }));
  expect(h.onDelete).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/sure|confirm/i)).toBeNull();
});

test('the set can be retyped as a warmup', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel()} {...h} />);
  expect(screen.getByRole('radio', { name: 'Working', checked: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: 'Warmup' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Log set' }));
  expect(h.onSave).toHaveBeenCalledWith({ loadKg: 80, reps: 9, type: 'warmup' });
});

test('bodyweight sets take reps only and can be logged without a load', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel({ bodyweight: true, loadKg: null, reps: 12, title: 'Push-up · Set 1' })} {...h} />);
  expect(screen.queryByRole('adjustable', { name: 'Load' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Log set' }));
  expect(h.onSave).toHaveBeenCalledWith({ loadKg: null, reps: 12, type: 'working' });
});

test('a loaded set with no load yet cannot be logged until one is set', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel({ loadKg: null, reps: 6 })} {...h} />);
  expect(screen.getByRole('button', { name: 'Log set' })).toBeDisabled();
  expect(screen.getByText('Set a load first')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  expect(screen.getByRole('button', { name: 'Log set' })).toBeEnabled();
});

test('long-press opens direct entry; a valid number replaces the value, an invalid one is refused', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel()} {...h} />);
  await fireEvent(screen.getByRole('adjustable', { name: 'Load' }), 'longPress');
  const input = screen.getByLabelText('Load in kilograms');
  expect(input).toHaveProp('keyboardType', 'decimal-pad');
  await fireEvent.changeText(input, 'abc');
  await fireEvent(input, 'submitEditing');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a load of 0 kg or more.');
  await fireEvent.changeText(input, '102,5');
  await fireEvent(input, 'submitEditing');
  expect(screen.queryByLabelText('Load in kilograms')).toBeNull();
  expect(screen.getByRole('adjustable', { name: 'Load' })).toHaveProp('accessibilityValue', { text: '102.5 kilograms' });
  await fireEvent.press(screen.getByRole('button', { name: 'Log set' }));
  expect(h.onSave).toHaveBeenCalledWith({ loadKg: 102.5, reps: 9, type: 'working' });
});

test('reps direct entry takes whole numbers of at least 1', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel()} initialEntry="reps" {...h} />);
  const input = screen.getByLabelText('Reps');
  expect(input).toHaveProp('keyboardType', 'number-pad');
  await fireEvent.changeText(input, '0');
  await fireEvent(input, 'submitEditing');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number of reps, 1 or more.');
  await fireEvent.changeText(input, '12');
  await fireEvent(input, 'submitEditing');
  expect(screen.getByRole('adjustable', { name: 'Reps' })).toHaveProp('accessibilityValue', { text: '12 reps' });
});

test('is non-blocking: not a modal, and Close dismisses without saving', async () => {
  const h = handlers();
  const { toJSON } = await render(<SetSheet model={sheetModel()} {...h} />);
  expect(JSON.stringify(toJSON())).not.toContain('"Modal"');
  expect(JSON.stringify(toJSON())).not.toContain('accessibilityViewIsModal');
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(h.onClose).toHaveBeenCalledTimes(1);
  expect(h.onSave).not.toHaveBeenCalled();
});

test('shows saving, and a calm not-saved message when the commit failed', async () => {
  const h = handlers();
  await render(<SetSheet model={sheetModel({ saveState: 'saving' })} {...h} />);
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await screen.rerender(<SetSheet model={sheetModel({ saveState: 'failed' })} errorText="Not saved. Nothing was changed. Try again." {...h} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Not saved. Nothing was changed. Try again.');
  expect(screen.getByRole('button', { name: 'Log set' })).toBeEnabled();
});
