import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planKeys } from '@/features/plan';
import { useActiveWorkout } from '@/store/active-workout';
import { workoutService, type WorkoutService } from '../services/workout-service';
import { undoWindow } from '../workouts.undo';
import { workoutKeys } from './query-keys';
import { beginActiveSession } from './session-runtime';

/** Subscribes to app foreground/background changes; pass a stable listener (module function or `useCallback`). */
export function useAppStateChange(listener: (state: AppStateStatus) => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', listener);
    return () => subscription.remove();
  }, [listener]);
}

/** Marks every training read stale after a write. */
export function useRefreshWorkouts() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries({ queryKey: workoutKeys.all }), [client]);
}

/** Starts a session from a template and makes it the active one. */
export function useStartSession() {
  const refresh = useRefreshWorkouts();
  return useMutation({
    mutationKey: workoutKeys.startSession,
    mutationFn: (templateId: string) => workoutService.startSession(templateId),
    onSuccess: async (session) => { beginActiveSession(session); await refresh(); },
  });
}

/** Deletes a session, ends it if it was the active one, and offers the undo toast. */
export function useDeleteSession() {
  const refresh = useRefreshWorkouts();
  return useMutation({
    mutationKey: workoutKeys.deleteSession,
    mutationFn: (sessionId: string) => workoutService.deleteSession(sessionId),
    onSuccess: async (result, sessionId) => {
      if (useActiveWorkout.getState().activeSessionId === sessionId) useActiveWorkout.getState().end();
      undoWindow.offer(result.undo, 'Session deleted');
      await refresh();
    },
  });
}

/** The current Training Program and weekly target (read from the latest Plan Version). */
export function useProgramQuery() {
  return useQuery({ queryKey: workoutKeys.program, queryFn: () => workoutService.readProgram() });
}

/** One Save is one *Your edit* Plan Version; plan reads are refreshed along with training reads. */
export function useSaveProgram() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: workoutKeys.saveProgram,
    mutationFn: (changes: Parameters<WorkoutService['saveProgram']>[0]) => workoutService.saveProgram(changes),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: workoutKeys.all }), client.invalidateQueries({ queryKey: planKeys.all })]);
    },
  });
}
