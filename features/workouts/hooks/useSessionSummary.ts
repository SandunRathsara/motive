import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveWorkout } from '@/store/active-workout';
import { WorkoutsError } from '../workouts.errors';
import { workoutService } from '../services/workout-service';
import { undoWindow } from '../workouts.undo';
import { buildSessionSummary, workoutErrorText, type SessionSummaryViewModel } from '../workouts.view-models';
import { workoutKeys } from './query-keys';

/** S5: volume, sets per muscle group, the comparison with the template's last session and the "next time" line. */
export function useSessionSummary(sessionId: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: workoutKeys.summary(sessionId), queryFn: () => workoutService.readSummary(sessionId) });
  const remove = useMutation({
    mutationKey: workoutKeys.deleteSession,
    mutationFn: () => workoutService.deleteSession(sessionId),
    onSuccess: async (result) => {
      if (useActiveWorkout.getState().activeSessionId === sessionId) useActiveWorkout.getState().end();
      undoWindow.offer(result.undo, 'Session deleted');
      await client.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
  const model: SessionSummaryViewModel = query.isPending ? { status: 'loading' }
    : query.error instanceof WorkoutsError && query.error.code === 'notFound' ? { status: 'missing' }
      : query.isError ? { status: 'error', retry: () => { void query.refetch(); } }
        : { status: 'ready', ...buildSessionSummary(query.data) };
  const deleteSession = useCallback(async (): Promise<boolean> => {
    try { await remove.mutateAsync(); return true; } catch { return false; }
  }, [remove]);
  return { model, deleteSession, errorText: workoutErrorText(remove.error) };
}
