import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dayKey } from '@/lib/utils/time';
import { workoutService } from '../services/workout-service';
import { buildTrainingWeek, type TrainingWeekViewModel } from '../workouts.train-view';
import { toLoadable, workoutErrorText } from '../workouts.view-models';
import { workoutKeys } from './query-keys';
import { beginActiveSession } from './session-runtime';
import { useAppStateChange, useDeleteSession, useStartSession } from './shared';
import { useNow } from './useNow';

/** S2: weekly progress, the next template, templates, recent sessions and Other Activity (SIG-9). */
export function useTrainingWeek() {
  const client = useQueryClient();
  const now = useNow();
  const query = useQuery({ queryKey: workoutKeys.overview(dayKey(now)), queryFn: () => workoutService.readOverview(Date.now()) });
  // Health links are derived on read, so a foreground refresh picks up a sync or a workout deleted in Health.
  useAppStateChange(useCallback((state) => {
    if (state === 'active') void client.invalidateQueries({ queryKey: workoutKeys.all });
  }, [client]));

  const start = useStartSession();
  const remove = useDeleteSession();
  const model: TrainingWeekViewModel = toLoadable(query, (data) => buildTrainingWeek({ ...data, now }));

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
