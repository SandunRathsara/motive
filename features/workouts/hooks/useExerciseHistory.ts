import { useQuery } from '@tanstack/react-query';
import { getExerciseById } from '../workouts.content';
import { workoutService } from '../services/workout-service';
import { buildExerciseHistory, type ExerciseHistoryViewModel } from '../workouts.history-view';
import { toLoadable } from '../workouts.view-models';
import { workoutKeys } from './query-keys';

/** Every session containing the exercise, across all templates (TRN-5), including deleted templates (G10). */
export function useExerciseHistory(exerciseId: string): ExerciseHistoryViewModel {
  const query = useQuery({ queryKey: workoutKeys.history(exerciseId), queryFn: () => workoutService.readExerciseHistory(exerciseId) });
  return toLoadable(query, (history) => buildExerciseHistory(exerciseId, getExerciseById(exerciseId) ?? null, history));
}
