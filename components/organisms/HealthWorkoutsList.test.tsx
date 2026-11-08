import { render, screen } from '@testing-library/react-native';
import { HealthWorkoutsList } from './HealthWorkoutsList';

test('cached Health workouts list their activity, time and duration without linking controls', async () => {
  await render(<HealthWorkoutsList workouts={[
    { id: 'workout-1', activityName: 'Traditional strength training', timeText: 'Today at 09:00', durationText: '45 min' },
  ]} />);
  expect(screen.getByRole('header', { name: 'Recent Health workouts' })).toBeOnTheScreen();
  expect(screen.getByLabelText('Traditional strength training · Today at 09:00 · 45 min')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
});

test('the workout list stays useful when no workouts are cached', async () => {
  await render(<HealthWorkoutsList workouts={[]} />);
  expect(screen.getByText('No cached Health workouts yet.')).toBeOnTheScreen();
});
