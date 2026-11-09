import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workoutService } from '../services/workout-service';
import { buildTodayTraining, type TodayTrainingViewModel } from '../workouts.today-view';
import { toLoadable, workoutErrorText } from '../workouts.view-models';
import { workoutKeys } from './query-keys';
import { beginActiveSession } from './session-runtime';
import { useStartSession } from './shared';

/**
 * Today's Start/Resume card and the Set quick-add (TODAY-1, TODAY-5): both open the active session, or
 * start the next template in the rotation. `open()` resolves to the session id to navigate to.
 */
export function useTodayTraining() {
  const query = useQuery({ queryKey: workoutKeys.today, queryFn: () => workoutService.readToday() });
  const start = useStartSession();
  const { isPending, isError, data, refetch } = query;
  const model = useMemo<TodayTrainingViewModel>(
    () => toLoadable({ isPending, isError, data, refetch }, buildTodayTraining),
    [isPending, isError, data, refetch],
  );

  const open = useCallback(async (): Promise<string | null> => {
    if (model.status !== 'ready') return null;
    if (model.action === 'resume' && model.sessionId && query.data?.active) {
      beginActiveSession(query.data.active);
      return model.sessionId;
    }
    if (model.action === 'start' && model.templateId) {
      try { return (await start.mutateAsync(model.templateId)).id; } catch { return null; }
    }
    return null;
  }, [model, query.data, start]);

  return { model, open, starting: start.isPending, errorText: workoutErrorText(start.error) };
}
