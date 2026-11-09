import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TodayTrainingViewModel } from '@/features/workouts';
import { QuickAddSet } from './QuickAddSet';

const ready = (action: 'start' | 'resume' | 'none'): TodayTrainingViewModel => ({
  status: 'ready', action, templateId: action === 'none' ? null : 'upper', templateName: action === 'none' ? null : 'Upper',
  sessionId: action === 'resume' ? 's1' : null, buttonLabel: 'Start', title: 'Upper', detail: '', accessibilityLabel: 'Start Upper',
});

test('with a session in progress it opens that session', async () => {
  const onPress = jest.fn();
  await render(<QuickAddSet model={ready('resume')} onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Add set' });
  expect(button).toHaveProp('accessibilityHint', 'Opens your Upper session');
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('without one it starts the next template', async () => {
  await render(<QuickAddSet model={ready('start')} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Add set' })).toHaveProp('accessibilityHint', 'Starts Upper');
});

test('stays visible but disabled until it has somewhere to go', async () => {
  const onPress = jest.fn();
  await render(<QuickAddSet model={ready('none')} onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Add set' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  await screen.rerender(<QuickAddSet model={{ status: 'loading' }} onPress={onPress} />);
  expect(screen.getByRole('button', { name: 'Add set' })).toBeDisabled();
});

test('a start in flight disables it', async () => {
  await render(<QuickAddSet model={ready('start')} busy onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Add set' })).toBeDisabled();
});
