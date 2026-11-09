import { fireEvent, render, screen } from '@testing-library/react-native';
import { TrainingSettings } from './TrainingSettings';

test('shows the weekly target and the program, both opening the editor', async () => {
  const onOpenProgram = jest.fn();
  await render(<TrainingSettings model={{ status: 'ready', weeklyTarget: 3, weeklyTargetText: '3 sessions', programText: 'Full Body · 5 exercises' }} onOpenProgram={onOpenProgram} />);
  expect(screen.getByRole('button', { name: 'Weekly session target' })).toHaveProp('accessibilityValue', { text: '3 sessions' });
  await fireEvent.press(screen.getByRole('button', { name: 'Weekly session target' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Training Program' }));
  expect(screen.getByRole('button', { name: 'Training Program' })).toHaveProp('accessibilityValue', { text: 'Full Body · 5 exercises' });
  expect(onOpenProgram).toHaveBeenCalledTimes(2);
});

test('loading and a failed read are calm, and a failed read can retry', async () => {
  const retry = jest.fn();
  const view = await render(<TrainingSettings model={{ status: 'loading' }} onOpenProgram={jest.fn()} />);
  expect(screen.getByText('Loading your training…')).toBeOnTheScreen();
  await view.rerender(<TrainingSettings model={{ status: 'error', retry }} onOpenProgram={jest.fn()} />);
  expect(screen.getByText('Couldn’t read your training. Your record hasn’t been changed.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalled();
});
