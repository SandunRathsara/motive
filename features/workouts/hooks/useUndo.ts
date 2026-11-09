import { useCallback, useSyncExternalStore } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../services/workout-service';
import { undoWindow, type UndoOffer } from '../workouts.undo';
import { workoutErrorText } from '../workouts.view-models';
import { beginActiveSession } from './session-runtime';
import { workoutKeys } from './query-keys';

/** The one shared undo toast (D2): 5 s, no dialog. Screens render `offer` when present. */
export function useUndo() {
  const client = useQueryClient();
  const offer = useSyncExternalStore(undoWindow.subscribe, undoWindow.get, undoWindow.get);
  const mutation = useMutation({
    mutationKey: workoutKeys.undo,
    mutationFn: (current: UndoOffer) => workoutService.undo(current.token),
    onSuccess: async (_result, current) => {
      if (current.token.kind === 'restoreSession' && current.token.session.endedAt === null) beginActiveSession(current.token.session);
      await client.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
  const undo = useCallback(async (): Promise<boolean> => {
    const current = undoWindow.get();
    if (!current) return false;
    undoWindow.clear();
    try { await mutation.mutateAsync(current); return true; } catch { return false; }
  }, [mutation]);
  return { offer, undo, dismiss: undoWindow.clear, errorText: workoutErrorText(mutation.error) };
}
