import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planKeys } from '@/features/plan';
import { workoutService } from '../services/workout-service';
import { plural } from '../workouts.format';
import { workoutErrorText } from '../workouts.view-models';
import { workoutKeys } from './query-keys';

export type TrainingSettingsViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | {
    status: 'ready';
    weeklyTarget: number;
    /** "3 sessions". */
    weeklyTargetText: string;
    /** "Full Body · 5 exercises" or "3 templates". */
    programText: string;
  };

/** Settings rows for the weekly target and the Training Program (DATA-9). */
export function useTrainingSettings() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: workoutKeys.program, queryFn: () => workoutService.readProgram() });
  const mutation = useMutation({
    mutationKey: workoutKeys.saveProgram,
    mutationFn: (weeklySessionTarget: number) => workoutService.saveProgram({ weeklySessionTarget }),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: workoutKeys.all }), client.invalidateQueries({ queryKey: planKeys.all })]);
    },
  });
  const rotation = query.data?.state.trainingProgram.rotation ?? [];
  const model: TrainingSettingsViewModel = query.isPending ? { status: 'loading' }
    : query.isError ? { status: 'error', retry: () => { void query.refetch(); } }
      : {
        status: 'ready', weeklyTarget: query.data.state.weeklySessionTarget,
        weeklyTargetText: plural(query.data.state.weeklySessionTarget, 'session'),
        programText: rotation.length === 1 ? `${rotation[0].name} · ${plural(rotation[0].exercises.length, 'exercise')}` : plural(rotation.length, 'template'),
      };
  const setWeeklyTarget = useCallback(async (value: number): Promise<boolean> => {
    try { await mutation.mutateAsync(value); return true; } catch { return false; }
  }, [mutation]);
  return { model, setWeeklyTarget, errorText: workoutErrorText(mutation.error) };
}
