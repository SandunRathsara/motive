import { createElement, type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { planKeys } from '@/features/plan';
import { useActiveWorkout } from '@/store/active-workout';
import { workoutService } from '../services/workout-service';
import { WorkoutsError } from '../workouts.errors';
import { progressionPrescription } from '../workouts.history';
import { computeProgression } from '../workouts.progression';
import type { SetEntry, TemplateExercise, WorkoutSession } from '../workouts.schemas';
import { undoWindow } from '../workouts.undo';
import { workoutKeys } from './query-keys';
import { useActiveSession } from './useActiveSession';
import { useProgramEditor } from './useProgramEditor';
import { useSessionSummary } from './useSessionSummary';
import { useTodayTraining } from './useTodayTraining';
import { useTrainingSettings } from './useTrainingSettings';
import { useUndo } from './useUndo';

jest.mock('../services/workout-service', () => ({
  workoutService: {
    readToday: jest.fn(), readOverview: jest.fn(), readSession: jest.fn(), readSummary: jest.fn(), readExerciseHistory: jest.fn(), readProgram: jest.fn(),
    startSession: jest.fn(), logSet: jest.fn(), editSet: jest.fn(), deleteSet: jest.fn(), finishSession: jest.fn(), deleteSession: jest.fn(),
    undo: jest.fn(), saveProgram: jest.fn(),
  },
}));
const service = jest.mocked(workoutService);

const squat: TemplateExercise = { id: 'sq', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 };
const t0 = Date.UTC(2026, 10, 9, 10);
const session = (extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1', templateId: 'full-body', startedAt: t0, endedAt: null, completed: false, deload: false,
  prescription: { templateName: 'Full Body', exercises: [squat] }, ...extra,
});
const set = (index: number, loadKg: number, reps: number): SetEntry => ({
  id: `set-${index}`, sessionId: 's1', templateExerciseId: 'sq', exerciseId: 'back-squat', index, type: 'working', loadKg, reps, committedAt: Date.now(), editedAt: null,
});
function detail(sets: SetEntry[] = [], history: { loadKg: number; reps: number }[] | null = [{ loadKg: 80, reps: 8 }, { loadKg: 80, reps: 8 }, { loadKg: 80, reps: 8 }]) {
  return {
    session: { ...session(), sets },
    exercises: [{
      templateExercise: squat,
      exercise: { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps' as const, equipment: 'barbell' as const, bodyweight: false },
      bodyweight: false,
      progression: computeProgression(progressionPrescription(squat), history ? [{ id: 'old', sets: history.map((entry) => ({ type: 'working' as const, ...entry })) }] : []),
      sets,
    }],
  };
}

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client }, children);
beforeEach(() => {
  // Only the service mocks: resetting everything would also wipe React Native's AppState mock.
  for (const fn of Object.values(service)) fn.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always', gcTime: Infinity }, mutations: { retry: false, networkMode: 'always', gcTime: Infinity } } });
  useActiveWorkout.getState().reset();
  undoWindow.clear();
});
afterEach(() => { client.clear(); undoWindow.clear(); useActiveWorkout.getState().reset(); });

describe('useTodayTraining', () => {
  test('Start the next template, remember the session as active and return its id', async () => {
    service.readToday.mockResolvedValue({ active: null, next: { id: 'full-body', name: 'Full Body', exercises: [squat] } });
    service.startSession.mockResolvedValue(session());
    const { result } = await renderHook(() => useTodayTraining(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    expect(result.current.model).toMatchObject({ action: 'start', buttonLabel: 'Start', title: 'Full Body' });
    let id: string | null = null;
    await act(async () => { id = await result.current.open(); });
    expect(id).toBe('s1');
    expect(service.startSession).toHaveBeenCalledWith('full-body');
    expect(useActiveWorkout.getState()).toMatchObject({ activeSessionId: 's1', expandedExerciseId: 'sq' });
  });

  test('Resume returns the active session without starting another', async () => {
    service.readToday.mockResolvedValue({ active: { ...session(), sets: [set(0, 80, 8)] }, next: null });
    const { result } = await renderHook(() => useTodayTraining(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    expect(result.current.model).toMatchObject({ action: 'resume', detail: '1 set logged' });
    let id: string | null = null;
    await act(async () => { id = await result.current.open(); });
    expect(id).toBe('s1');
    expect(service.startSession).not.toHaveBeenCalled();
    expect(useActiveWorkout.getState().activeSessionId).toBe('s1');
  });

  test('a failed start surfaces calm text and returns nothing to navigate to', async () => {
    service.readToday.mockResolvedValue({ active: null, next: { id: 'full-body', name: 'Full Body', exercises: [squat] } });
    service.startSession.mockRejectedValue(new WorkoutsError('activeSessionExists'));
    const { result } = await renderHook(() => useTodayTraining(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    let id: string | null = 'x';
    await act(async () => { id = await result.current.open(); });
    expect(id).toBeNull();
    await waitFor(() => expect(result.current.errorText).toBe('A session is already in progress. Resume it or finish it first.'));
  });

  test('a read failure is an error model with retry', async () => {
    service.readToday.mockRejectedValueOnce(new WorkoutsError('readFailed')).mockResolvedValue({ active: null, next: null });
    const { result } = await renderHook(() => useTodayTraining(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('error'));
    await act(async () => { (result.current.model as { retry: () => void }).retry(); });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
  });
});

describe('useActiveSession', () => {
  test('logging a chip commits it as shown, starts the rest, offers undo and refreshes', async () => {
    service.readSession.mockResolvedValue(detail());
    service.logSet.mockResolvedValue({ set: set(0, 80, 9), undo: { kind: 'deleteSet', setId: 'set-0' } });
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    const chip = (result.current.model as { exercises: { chips: { key: string; primaryText: string }[] }[] }).exercises[0].chips[0];
    expect(chip.primaryText).toBe('80 × 9');
    let ok = false;
    await act(async () => { ok = await result.current.actions.logChip(chip.key); });
    expect(ok).toBe(true);
    expect(service.logSet).toHaveBeenCalledWith({ sessionId: 's1', templateExerciseId: 'sq', loadKg: 80, reps: 9, durationMs: expect.any(Number) });
    expect(service.readSession.mock.calls.length).toBeGreaterThan(1);
    const store = useActiveWorkout.getState();
    expect(store.restSeconds).toBe(90);
    expect(store.restDeadline).not.toBeNull();
    expect(undoWindow.get()).toMatchObject({ label: 'Set logged', token: { kind: 'deleteSet', setId: 'set-0' } });
  });

  test('the measured set time follows D1: a set logged after the rest counts from the rest end', async () => {
    service.readSession.mockResolvedValue(detail());
    service.logSet.mockResolvedValue({ set: set(0, 80, 9), undo: { kind: 'deleteSet', setId: 'set-0' } });
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    const now = Date.now();
    await act(() => {
      useActiveWorkout.getState().setSetTimer({ actionableAt: now - 200_000, restEndedAt: null, firstTouchAt: null, backgrounded: [], backgroundedAt: null });
      useActiveWorkout.getState().startRest(now - 4_000, 90);
    });
    await act(async () => { await result.current.actions.logChip('sq:0'); });
    const { durationMs } = service.logSet.mock.calls[0][0];
    expect(durationMs).toBeGreaterThanOrEqual(3_900);
    expect(durationMs).toBeLessThan(6_000);
  });

  test('a failed commit leaves the chip marked not saved with its values, and a retry saves it (DATA-2)', async () => {
    service.readSession.mockResolvedValue(detail());
    service.logSet.mockRejectedValueOnce(new WorkoutsError('writeFailed'))
      .mockResolvedValueOnce({ set: set(0, 80, 9), undo: { kind: 'deleteSet', setId: 'set-0' } });
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    const firstChip = () => (result.current.model as { exercises: { chips: { saveState: string; loadKg: number | null; reps: number }[] }[] }).exercises[0].chips[0];
    await act(async () => { expect(await result.current.actions.logChip('sq:0')).toBe(false); });
    expect(firstChip()).toMatchObject({ saveState: 'failed', loadKg: 80, reps: 9 });
    expect(result.current.errorText).toBe('Not saved. Nothing was changed. Try again.');
    expect(undoWindow.get()).toBeNull();
    expect(useActiveWorkout.getState().restDeadline).toBeNull();
    await act(async () => { expect(await result.current.actions.logChip('sq:0')).toBe(true); });
    expect(firstChip()).toMatchObject({ saveState: 'idle' });
    expect(result.current.errorText).toBeUndefined();
  });

  test('a stepper draft is what gets logged; a chip without a load is not loggable', async () => {
    service.readSession.mockResolvedValue(detail([], null));
    service.logSet.mockResolvedValue({ set: set(0, 60, 6), undo: { kind: 'deleteSet', setId: 'set-0' } });
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    await act(async () => { expect(await result.current.actions.logChip('sq:0')).toBe(false); });
    expect(service.logSet).not.toHaveBeenCalled();
    await act(async () => { await result.current.actions.adjust('sq:0', { loadKg: 60 }); });
    await act(async () => { await result.current.actions.logChip('sq:0'); });
    expect(service.logSet).toHaveBeenCalledWith(expect.objectContaining({ loadKg: 60, reps: 6 }));
  });

  test('a stepper draft does not survive a sheet log or a delete, so it cannot reappear on a later chip', async () => {
    service.readSession.mockResolvedValue(detail([], null));
    service.logSet.mockResolvedValue({ set: set(0, 60, 6), undo: { kind: 'deleteSet', setId: 'set-0' } });
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    const firstChip = () => (result.current.model as { exercises: { chips: { key: string; loadKg: number | null }[] }[] }).exercises[0].chips[0];
    await act(async () => { await result.current.actions.adjust('sq:0', { loadKg: 100 }); });
    expect(firstChip().loadKg).toBe(100);
    // The set is logged from the sheet with other values; the unlogged slot must not keep the old draft.
    await act(async () => { await result.current.actions.logSet({ templateExerciseId: 'sq', loadKg: 60, reps: 6 }); });
    service.readSession.mockResolvedValue(detail([], null));
    await act(async () => { await client.invalidateQueries({ queryKey: workoutKeys.all }); });
    await waitFor(() => expect(firstChip().loadKg).toBeNull());
  });

  test('adjusting a saved chip is an edit after save', async () => {
    service.readSession.mockResolvedValue(detail([set(0, 80, 9)]));
    service.editSet.mockResolvedValue({ set: set(0, 82.5, 9) });
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    await act(async () => { await result.current.actions.adjust('sq:0', { loadKg: 82.5 }); });
    expect(service.editSet).toHaveBeenCalledWith({ setId: 'set-0', loadKg: 82.5, reps: 9 });
  });

  test('delete offers undo; finish ends the active session and returns its id; +30 s and Skip drive the rest bar', async () => {
    service.readSession.mockResolvedValue(detail([set(0, 80, 9)]));
    service.deleteSet.mockResolvedValue({ undo: { kind: 'restoreSet', entry: set(0, 80, 9) } });
    service.finishSession.mockResolvedValue(session({ endedAt: t0 + 1, completed: true }));
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    await act(async () => { await result.current.actions.deleteSet('set-0'); });
    expect(undoWindow.get()).toMatchObject({ label: 'Set deleted' });
    await act(() => { useActiveWorkout.getState().startRest(Date.now() + 90_000, 90); });
    await act(() => result.current.actions.addThirtySeconds());
    expect(useActiveWorkout.getState().restSeconds).toBe(120);
    await act(() => result.current.actions.skipRest());
    expect(useActiveWorkout.getState().restDeadline).toBeNull();
    let finished: string | null = null;
    await act(async () => { finished = await result.current.actions.finish(); });
    expect(finished).toBe('s1');
    expect(useActiveWorkout.getState().activeSessionId).toBeNull();
  });

  test('a failed finish keeps the session active', async () => {
    service.readSession.mockResolvedValue(detail());
    service.finishSession.mockRejectedValue(new WorkoutsError('writeFailed'));
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    let finished: string | null = 'x';
    await act(async () => { finished = await result.current.actions.finish(); });
    expect(finished).toBeNull();
    expect(useActiveWorkout.getState().activeSessionId).toBe('s1');
  });

  test('the sheet for a chip carries the exercise increment', async () => {
    service.readSession.mockResolvedValue(detail([set(0, 80, 9)]));
    const { result } = await renderHook(() => useActiveSession('s1'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    expect(result.current.sheet('sq:0')).toMatchObject({ title: 'Back Squat · Set 1', setId: 'set-0', incrementKg: 2.5 });
    expect(result.current.sheet('nope')).toBeNull();
  });
});

describe('useUndo', () => {
  test('undo applies the inverse once and refreshes training reads', async () => {
    service.undo.mockResolvedValue(undefined);
    undoWindow.offer({ kind: 'deleteSet', setId: 'set-0' }, 'Set logged');
    const { result } = await renderHook(() => useUndo(), { wrapper });
    expect(result.current.offer?.label).toBe('Set logged');
    await client.prefetchQuery({ queryKey: workoutKeys.today, queryFn: async () => 1 });
    await act(async () => { expect(await result.current.undo()).toBe(true); });
    expect(service.undo).toHaveBeenCalledWith({ kind: 'deleteSet', setId: 'set-0' });
    expect(client.getQueryState(workoutKeys.today)?.isInvalidated).toBe(true);
    expect(undoWindow.get()).toBeNull();
    await act(async () => { expect(await result.current.undo()).toBe(false); });
  });

  test('restoring a deleted active session makes it active again', async () => {
    service.undo.mockResolvedValue(undefined);
    undoWindow.offer({ kind: 'restoreSession', session: session(), sets: [] }, 'Session deleted');
    const { result } = await renderHook(() => useUndo(), { wrapper });
    await act(async () => { await result.current.undo(); });
    expect(useActiveWorkout.getState().activeSessionId).toBe('s1');
  });
});

describe('summary, program editor and settings', () => {
  test('a missing session is reported as missing, not as an error', async () => {
    service.readSummary.mockRejectedValue(new WorkoutsError('notFound'));
    const { result } = await renderHook(() => useSessionSummary('gone'), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('missing'));
  });

  const program = { versionNumber: 3, createdAt: t0, state: { weeklySessionTarget: 3, trainingProgram: { rotation: [{ id: 'full-body', name: 'Full Body', exercises: [squat] }] } } };

  test('saving an invalid draft never reaches the service; a valid save invalidates plan and training reads', async () => {
    service.readProgram.mockResolvedValue(program as never);
    service.saveProgram.mockResolvedValue({ version: { number: 4 } as never, changedFields: ['weeklySessionTarget'] });
    const { result } = await renderHook(() => useProgramEditor(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    expect(result.current.model).toMatchObject({ versionLabel: 'Plan v3', draft: { weeklySessionTarget: 3 } });
    const draft = (result.current.model as { draft: Parameters<typeof result.current.save>[0] }).draft;
    let outcome: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => { outcome = await result.current.save({ ...draft, weeklySessionTarget: 9 }); });
    expect(outcome).toMatchObject({ saved: false, validation: { valid: false } });
    expect(service.saveProgram).not.toHaveBeenCalled();
    await client.prefetchQuery({ queryKey: planKeys.current, queryFn: async () => 1 });
    await act(async () => { outcome = await result.current.save({ ...draft, weeklySessionTarget: 4 }); });
    expect(outcome).toEqual({ saved: true, changed: true });
    expect(client.getQueryState(planKeys.current)?.isInvalidated).toBe(true);
  });

  test('a failed save is not saved and says so', async () => {
    service.readProgram.mockResolvedValue(program as never);
    service.saveProgram.mockRejectedValue(new WorkoutsError('writeFailed'));
    const { result } = await renderHook(() => useProgramEditor(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    const draft = (result.current.model as { draft: Parameters<typeof result.current.save>[0] }).draft;
    await act(async () => { expect(await result.current.save({ ...draft, weeklySessionTarget: 4 })).toEqual({ saved: false, validation: null }); });
    await waitFor(() => expect(result.current.errorText).toBe('Not saved. Nothing was changed. Try again.'));
  });

  test('Settings rows show the target and program, and the target saves through the service', async () => {
    service.readProgram.mockResolvedValue(program as never);
    service.saveProgram.mockResolvedValue({ version: null, changedFields: [] });
    const { result } = await renderHook(() => useTrainingSettings(), { wrapper });
    await waitFor(() => expect(result.current.model.status).toBe('ready'));
    expect(result.current.model).toMatchObject({ weeklyTarget: 3, weeklyTargetText: '3 sessions', programText: 'Full Body · 1 exercise' });
    await act(async () => { expect(await result.current.setWeeklyTarget(4)).toBe(true); });
    expect(service.saveProgram).toHaveBeenCalledWith({ weeklySessionTarget: 4 });
  });
});
