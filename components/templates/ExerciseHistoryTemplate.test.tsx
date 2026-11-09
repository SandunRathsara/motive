import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ExerciseHistoryViewModel } from '@/features/workouts';
import { ExerciseHistoryTemplate } from './ExerciseHistoryTemplate';

const ready: ExerciseHistoryViewModel = {
  status: 'ready', exerciseId: 'bench-press', name: 'Bench Press', muscleGroupLabel: 'Chest', sessionCountText: '1 session',
  sessions: [{ sessionId: 's1', templateName: 'Upper', dateText: 'Mon 9 Nov', setsText: '80 × 9', warmupText: null }],
};

test('shows the exercise history', async () => {
  const onOpenSession = jest.fn();
  await render(<ExerciseHistoryTemplate model={ready} onOpenSession={onOpenSession} />);
  expect(screen.getByRole('header', { name: 'Bench Press' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Upper, Mon 9 Nov, 80 × 9' }));
  expect(onOpenSession).toHaveBeenCalledWith('s1');
});

test('loading and error states', async () => {
  const retry = jest.fn();
  await render(<ExerciseHistoryTemplate model={{ status: 'loading' }} onOpenSession={jest.fn()} />);
  expect(screen.getByText('Loading history…')).toBeOnTheScreen();
  await screen.rerender(<ExerciseHistoryTemplate model={{ status: 'error', retry }} onOpenSession={jest.fn()} />);
  expect(screen.getByText('Couldn’t read this history. Your record hasn’t been changed.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
