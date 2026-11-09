import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WorkoutsError } from '../workouts.errors';
import { workoutService } from '../services/workout-service';
import { buildSessionSummary, type SessionSummaryViewModel } from '../workouts.summary-view';
import { toLoadable, workoutErrorText } from '../workouts.view-models';
import { workoutKeys } from './query-keys';
import { useDeleteSession } from './shared';

/** S5: volume, sets per muscle group, the comparison with the template's last session and the "next time" line. */
export function useSessionSummary(sessionId: string) {
  const query = useQuery({ queryKey: workoutKeys.summary(sessionId), queryFn: () => workoutService.readSummary(sessionId) });
  const remove = useDeleteSession();
  const model: SessionSummaryViewModel = query.error instanceof WorkoutsError && query.error.code === 'notFound'
    ? { status: 'missing' } : toLoadable(query, buildSessionSummary);
  const deleteSession = useCallback(async (): Promise<boolean> => {
    try { await remove.mutateAsync(sessionId); return true; } catch { return false; }
  }, [remove, sessionId]);
  return { model, deleteSession, errorText: workoutErrorText(remove.error) };
}
