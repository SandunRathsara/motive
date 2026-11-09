import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dayKey } from '@/lib/utils/time';
import { useActiveWorkout } from '@/store/active-workout';
import { workoutService } from '../services/workout-service';
import { undoWindow } from '../workouts.undo';
import { buildTrainingWeek, workoutErrorText, type TrainingWeekViewModel } from '../workouts.view-models';
import { workoutKeys } from './query-keys';
import { beginActiveSession } from './session-runtime';
import { useNow } from './useNow';

/** S2: weekly progress, the next template, templates, recent sessions and Other Activity (SIG-9). */
export function useTrainingWeek() {
  const client = useQueryClient();
  const now = useNow();
  const day = dayKey(now);
  const query = useQuery({ queryKey: workoutKeys.overview(day), queryFn: () => workoutService.readOverview(Date.now()) });
  // Health links are derived on read, so a foreground refresh picks up a sync or a workout deleted in Health.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.invalidateQueries({ queryKey: workoutKeys.all });
    });
    return () => subscription.remove();
  }, [client]);

  const start = useMutation({
    mutationKey: workoutKeys.startSession,
    mutationFn: (templateId: string) => workoutService.startSession(templateId),
    onSuccess: async (session) => { beginActiveSession(session); await client.invalidateQueries({ queryKey: workoutKeys.all }); },
  });
  const remove = useMutation({
    mutationKey: workoutKeys.deleteSession,
    mutationFn: (sessionId: string) => workoutService.deleteSession(sessionId),
    onSuccess: async (result, sessionId) => {
      if (useActiveWorkout.getState().activeSessionId === sessionId) useActiveWorkout.getState().end();
      undoWindow.offer(result.undo, 'Session deleted');
      await client.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });

  const model: TrainingWeekViewModel = query.isPending ? { status: 'loading' }
    : query.isError ? { status: 'error', retry: () => { void query.refetch(); } }
      : { status: 'ready', ...buildTrainingWeek({ ...query.data, now }) };

  const startTemplate = useCallback(async (templateId: string): Promise<string | null> => {
    try { return (await start.mutateAsync(templateId)).id; } catch { return null; }
  }, [start]);
  const resume = useCallback((): string | null => {
    const active = query.data?.active;
    if (!active) return null;
    beginActiveSession(active);
    return active.id;
  }, [query.data]);
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try { await remove.mutateAsync(sessionId); return true; } catch { return false; }
  }, [remove]);

  return { model, startTemplate, resume, deleteSession, errorText: workoutErrorText(start.error ?? remove.error) };
}
