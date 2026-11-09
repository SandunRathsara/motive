import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveWorkout } from '@/store/active-workout';
import { workoutService, type EditSetInput, type LogSetInput } from '../services/workout-service';
import type { SetType } from '../workouts.schemas';
import { armSetTimer, backgroundSetTimer, endRest, foregroundSetTimer, setLoggingDurationMs, touchSetTimer } from '../workouts.timing';
import { undoWindow } from '../workouts.undo';
import {
  buildActiveSession, buildSetSheet, workoutErrorText,
  type ActiveSessionViewModel, type ChipDraft, type ChipPending, type SetSheetViewModel,
} from '../workouts.view-models';
import { workoutKeys } from './query-keys';
import { beginActiveSession } from './session-runtime';

export interface ActiveSessionActions {
  /** Any touch on the session screen: the first one after a commit starts the set timer during rest (D1). */
  touch(): void;
  expand(templateExerciseId: string | null): void;
  /**
   * Stepper change. On an unlogged chip it only changes the draft (nothing is saved until the chip is
   * tapped). On a saved chip it is an edit after save and commits immediately; for a burst of changes
   * prefer collecting them in the sheet and calling `editSet` once.
   */
  adjust(chipKey: string, values: Partial<ChipDraft>): Promise<boolean>;
  /** One tap: logs the chip as shown. A failed commit leaves it marked not saved; tapping again retries. */
  logChip(chipKey: string): Promise<boolean>;
  /** Log arbitrary values, for example a warmup or an extra set from the sheet. */
  logSet(values: { templateExerciseId: string; type?: SetType; loadKg: number | null; reps: number }): Promise<boolean>;
  editSet(setId: string, values: { loadKg?: number | null; reps?: number; type?: SetType }): Promise<boolean>;
  deleteSet(setId: string): Promise<boolean>;
  /** Resolves to the finished session id for navigating to the summary, or null when not saved. */
  finish(): Promise<string | null>;
  deleteSession(): Promise<boolean>;
  addThirtySeconds(): void;
  skipRest(): void;
  /** Wall-clock provider for the rest bar. */
  now(): number;
}

/** S3/S4: the active session (also used to correct a finished one, G9) with chips, rest and undo. */
export function useActiveSession(sessionId: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: workoutKeys.session(sessionId), queryFn: () => workoutService.readSession(sessionId) });
  const expandedExerciseId = useActiveWorkout((state) => state.expandedExerciseId);
  const restDeadline = useActiveWorkout((state) => state.restDeadline);
  const restSeconds = useActiveWorkout((state) => state.restSeconds);
  const [drafts, setDrafts] = useState<Record<string, ChipDraft>>({});
  const [pending, setPending] = useState<Record<string, ChipPending>>({});
  const [failure, setFailure] = useState<unknown>(null);

  const detail = query.data;
  const isActive = detail?.session.endedAt === null;
  useEffect(() => {
    if (detail && detail.session.endedAt === null) beginActiveSession(detail.session);
  }, [detail?.session.id, detail?.session.endedAt, detail]);

  // Backgrounded time is excluded from the set timer (D1).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const store = useActiveWorkout.getState();
      if (!store.setTimer) return;
      store.setSetTimer(state === 'active' ? foregroundSetTimer(store.setTimer, Date.now()) : backgroundSetTimer(store.setTimer, Date.now()));
    });
    return () => subscription.remove();
  }, []);

  const refresh = () => client.invalidateQueries({ queryKey: workoutKeys.all });
  const logMutation = useMutation({ mutationKey: workoutKeys.logSet, mutationFn: (input: LogSetInput) => workoutService.logSet(input), onSuccess: refresh });
  const editMutation = useMutation({ mutationKey: workoutKeys.editSet, mutationFn: (input: EditSetInput) => workoutService.editSet(input), onSuccess: refresh });
  const deleteSetMutation = useMutation({ mutationKey: workoutKeys.deleteSet, mutationFn: (setId: string) => workoutService.deleteSet(setId), onSuccess: refresh });
  const finishMutation = useMutation({ mutationKey: workoutKeys.finishSession, mutationFn: () => workoutService.finishSession(sessionId), onSuccess: refresh });
  const deleteSessionMutation = useMutation({ mutationKey: workoutKeys.deleteSession, mutationFn: () => workoutService.deleteSession(sessionId), onSuccess: refresh });

  const rest = restDeadline !== null && restSeconds !== null ? { deadlineMs: restDeadline, durationSeconds: restSeconds } : null;
  const content = useMemo(
    () => (detail ? buildActiveSession(detail, { expandedExerciseId, drafts, pending, rest }) : null),
    // `rest` is derived from the two primitives below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, expandedExerciseId, drafts, pending, restDeadline, restSeconds],
  );
  const model: ActiveSessionViewModel = content ? { status: 'ready', ...content }
    : query.isError ? { status: 'error', retry: () => { void query.refetch(); } } : { status: 'loading' };

  const find = useCallback((key: string) => {
    for (const card of content?.exercises ?? []) {
      const chip = card.chips.find((candidate) => candidate.key === key);
      if (chip) return { card, chip };
    }
    return null;
  }, [content]);

  // Chip slots shift after a log or a delete, so a draft left behind would reappear on another chip.
  const clearDrafts = useCallback((templateExerciseId: string) => {
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${templateExerciseId}:`))));
  }, []);

  const afterCommit = useCallback((templateExerciseId: string, committedAt: number) => {
    const rest = content?.exercises.find((card) => card.templateExerciseId === templateExerciseId)?.restSeconds ?? 90;
    const store = useActiveWorkout.getState();
    store.startRest(committedAt + rest * 1000, rest);
    store.setSetTimer(armSetTimer(committedAt));
  }, [content]);

  const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T | null> => {
    try { setFailure(null); return await work(); } catch (error) { setFailure(error); return null; }
  }, []);

  const actions: ActiveSessionActions = {
    touch() {
      const store = useActiveWorkout.getState();
      if (store.setTimer) store.setSetTimer(touchSetTimer(store.setTimer, Date.now()));
    },
    expand: (templateExerciseId) => useActiveWorkout.getState().expand(templateExerciseId),
    async adjust(key, values) {
      const found = find(key);
      if (!found) return false;
      const next = { loadKg: values.loadKg !== undefined ? values.loadKg : found.chip.loadKg, reps: values.reps ?? found.chip.reps };
      if (found.chip.setId) return (await run(() => editMutation.mutateAsync({ setId: found.chip.setId as string, ...next }))) !== null;
      setDrafts((current) => ({ ...current, [key]: next }));
      return true;
    },
    async logChip(key) {
      const found = find(key);
      if (!found || found.chip.setId || found.chip.needsLoad || found.chip.saveState === 'saving' || !isActive) return false;
      const { chip } = found;
      const tappedAt = Date.now();
      const store = useActiveWorkout.getState();
      const durationMs = setLoggingDurationMs(store.setTimer ?? armSetTimer(tappedAt), tappedAt, store.restDeadline);
      setPending((current) => ({ ...current, [key]: { status: 'saving', loadKg: chip.loadKg, reps: chip.reps } }));
      const result = await run(() => logMutation.mutateAsync({
        sessionId, templateExerciseId: chip.templateExerciseId, loadKg: chip.loadKg, reps: chip.reps, durationMs,
      }));
      if (!result) {
        setPending((current) => ({ ...current, [key]: { status: 'failed', loadKg: chip.loadKg, reps: chip.reps } }));
        return false;
      }
      setPending(({ [key]: _done, ...rest }) => rest);
      clearDrafts(chip.templateExerciseId);
      afterCommit(chip.templateExerciseId, result.set.committedAt);
      undoWindow.offer(result.undo, 'Set logged');
      return true;
    },
    async logSet(values) {
      const tappedAt = Date.now();
      const store = useActiveWorkout.getState();
      const durationMs = setLoggingDurationMs(store.setTimer ?? armSetTimer(tappedAt), tappedAt, store.restDeadline);
      const result = await run(() => logMutation.mutateAsync({ sessionId, durationMs, ...values }));
      if (!result) return false;
      clearDrafts(values.templateExerciseId);
      if (isActive) afterCommit(values.templateExerciseId, result.set.committedAt);
      undoWindow.offer(result.undo, 'Set logged');
      return true;
    },
    async editSet(setId, values) {
      return (await run(() => editMutation.mutateAsync({ setId, ...values }))) !== null;
    },
    async deleteSet(setId) {
      const result = await run(() => deleteSetMutation.mutateAsync(setId));
      if (!result) return false;
      const owner = content?.exercises.find((card) => card.chips.some((chip) => chip.setId === setId));
      if (owner) clearDrafts(owner.templateExerciseId);
      undoWindow.offer(result.undo, 'Set deleted');
      return true;
    },
    async finish() {
      const finished = await run(() => finishMutation.mutateAsync());
      if (!finished) return null;
      useActiveWorkout.getState().end();
      return finished.id;
    },
    async deleteSession() {
      const result = await run(() => deleteSessionMutation.mutateAsync());
      if (!result) return false;
      if (useActiveWorkout.getState().activeSessionId === sessionId) useActiveWorkout.getState().end();
      undoWindow.offer(result.undo, 'Session deleted');
      return true;
    },
    addThirtySeconds: () => useActiveWorkout.getState().addRest(30_000),
    skipRest() {
      const store = useActiveWorkout.getState();
      if (store.setTimer) store.setSetTimer(endRest(store.setTimer, Date.now()));
      store.skipRest();
    },
    now: () => Date.now(),
  };

  /** S4: the sheet for one chip (non-blocking; the session stays interactive behind it). */
  const sheet = useCallback((chipKey: string): SetSheetViewModel | null => {
    const found = find(chipKey);
    return found ? buildSetSheet(found.card, found.chip) : null;
  }, [find]);

  return { model, actions, sheet, errorText: workoutErrorText(failure) };
}
