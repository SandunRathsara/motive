import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ExerciseHistoryContent } from '@/features/workouts';
import { ExerciseHistory } from './ExerciseHistory';

const content: ExerciseHistoryContent = {
  exerciseId: 'bench-press', name: 'Bench Press', muscleGroupLabel: 'Chest', sessionCountText: '2 sessions',
  sessions: [
    { sessionId: 's2', templateName: 'Upper', dateText: 'Mon 9 Nov', setsText: '80 × 9, 80 × 9, 80 × 8', warmupText: 'Warmup 40 × 8' },
    { sessionId: 's1', templateName: 'Full Body', dateText: 'Fri 6 Nov', setsText: '77.5 × 10, 77.5 × 8', warmupText: null },
  ],
};

test('lists every session with its sets, newest first, across templates', async () => {
  await render(<ExerciseHistory content={content} onOpenSession={jest.fn()} />);
  expect(screen.getByText('Chest · 2 sessions')).toBeOnTheScreen();
  expect(screen.getByText('80 × 9, 80 × 9, 80 × 8')).toBeOnTheScreen();
  expect(screen.getByText('Warmup 40 × 8')).toBeOnTheScreen();
  expect(screen.getByText('77.5 × 10, 77.5 × 8')).toBeOnTheScreen();
  expect(screen.getByText('Full Body')).toBeOnTheScreen();
});

test('a session row is one labelled control that opens the session', async () => {
  const onOpenSession = jest.fn();
  await render(<ExerciseHistory content={content} onOpenSession={onOpenSession} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Upper, Mon 9 Nov, 80 × 9, 80 × 9, 80 × 8, Warmup 40 × 8' }));
  expect(onOpenSession).toHaveBeenCalledWith('s2');
});

test('shows a calm empty state', async () => {
  await render(<ExerciseHistory content={{ ...content, sessions: [], sessionCountText: '0 sessions' }} onOpenSession={jest.fn()} />);
  expect(screen.getByText('No sessions with this exercise yet.')).toBeOnTheScreen();
});
