import { useQuery } from '@tanstack/react-query';
import { getExerciseById } from '../workouts.content';
import { workoutService } from '../services/workout-service';
import { buildExerciseHistory, type ExerciseHistoryViewModel } from '../workouts.view-models';
import { workoutKeys } from './query-keys';

/** Every session containing the exercise, across all templates (TRN-5), including deleted templates (G10). */
export function useExerciseHistory(exerciseId: string): ExerciseHistoryViewModel {
  const query = useQuery({ queryKey: workoutKeys.history(exerciseId), queryFn: () => workoutService.readExerciseHistory(exerciseId) });
  if (query.isPending) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => { void query.refetch(); } };
  return { status: 'ready', ...buildExerciseHistory(exerciseId, getExerciseById(exerciseId) ?? null, query.data) };
}
