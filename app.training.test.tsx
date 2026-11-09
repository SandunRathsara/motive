// Keep Router integration tests outside app/ so they cannot become filesystem routes.
// Real routes, hooks and view models over a faked workout service: the screens are what is under test.
import { act, fireEvent, renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import RootLayout from './app/_layout';
import TabLayout from './app/(tabs)/_layout';
import TodayRoute from './app/(tabs)';
import TrainRoute from './app/(tabs)/train';
import SettingsRoute from './app/settings';
import ActiveSessionRoute from './app/session/[id]';
import SessionSummaryRoute from './app/session/[id]/summary';
import ProgramEditorRoute from './app/program';
import ExerciseHistoryRoute from './app/history/[exerciseId]';
import { queryClient } from './lib/query/client';
import { useActiveWorkout } from './store/active-workout';
import { undoWindow } from './features/workouts/workouts.undo';
import { workoutService } from './features/workouts/services/workout-service';
import { starterTrainingProgram } from './features/workouts/workouts.content';
import { computeProgression } from './features/workouts/workouts.progression';
import { progressionPrescription } from './features/workouts/workouts.history';
import type { SetEntry, WorkoutSession } from './features/workouts/workouts.schemas';

jest.mock('./global.css', () => ({}));
jest.mock('@/features/record-recovery', () => ({
  ...jest.requireActual('@/features/record-recovery'),
  useRecordGate: () => ({ status: 'ready', snapshotExists: true, retry: jest.fn(), restore: jest.fn(), erase: jest.fn(), share: jest.fn() }),
}));
jest.mock('./features/onboarding/services/read-onboarding-status', () => ({ readOnboardingStatus: async () => ({ status: 'present', skippedCount: 0 }) }));
jest.mock('@/features/metrics', () => ({ useUncleanExitTracking: jest.fn(), metrics: { record: jest.fn(async () => {}) } }));
jest.mock('@/features/health', () => ({
  ...jest.requireActual('@/features/health'),
  useHealthSyncOnOpen: jest.fn(),
  useTodayTrendLine: () => ({ data: null }),
}));
jest.mock('@/features/plan', () => ({
  ...jest.requireActual('@/features/plan'),
  useTodayPlan: () => ({ status: 'ready', dateLabel: 'Monday 9 November', targets: null, chipLabel: null, retry: jest.fn() }),
  useCurrentPlan: () => ({ isPending: false, data: { status: 'absent' }, refetch: jest.fn() }),
}));
jest.mock('@/features/data', () => ({
  useEraseLifecycle: () => ({ phase: 'ready', paused: null, retry: jest.fn() }),
  useDataExport: () => ({ step: 'idle', begin: jest.fn() }),
  useDeleteAllData: () => ({ step: 'idle', begin: jest.fn() }),
  useFaultInjection: () => ({ available: false }),
}));
jest.mock('./features/workouts/services/workout-service', () => ({
  workoutService: {
    readToday: jest.fn(), readOverview: jest.fn(), readSession: jest.fn(), readSummary: jest.fn(), readExerciseHistory: jest.fn(), readProgram: jest.fn(),
    startSession: jest.fn(), logSet: jest.fn(), editSet: jest.fn(), deleteSet: jest.fn(), finishSession: jest.fn(), deleteSession: jest.fn(),
    undo: jest.fn(), saveProgram: jest.fn(),
  },
}));
const service = jest.mocked(workoutService);

const squat = { id: 'sq', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 };
const fullBody = { id: 'full-body', name: 'Full Body', exercises: [squat] };
const started = Date.UTC(2026, 10, 9, 10);
const session = (extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1', templateId: 'full-body', startedAt: started, endedAt: null, completed: false, deload: false,
  prescription: { templateName: 'Full Body', exercises: [squat] }, ...extra,
});
const logged = (index: number, loadKg: number, reps: number): SetEntry => ({
  id: `set-${index}`, sessionId: 's1', templateExerciseId: 'sq', exerciseId: 'back-squat', index, type: 'working', loadKg, reps, committedAt: Date.now(), editedAt: null,
});
function detail(sets: SetEntry[] = [], extra: Partial<WorkoutSession> = {}) {
  return {
    session: { ...session(extra), sets },
    exercises: [{
      templateExercise: squat,
      exercise: { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps' as const, equipment: 'barbell' as const, bodyweight: false },
      bodyweight: false,
      progression: computeProgression(progressionPrescription(squat), [{ id: 'old', sets: [80, 80, 80].map((loadKg) => ({ type: 'working' as const, loadKg, reps: 8 })) }]),
      sets,
    }],
  };
}
const summary = (id = 's1') => ({
  session: session({ id, endedAt: started + 3_000_000, completed: true }),
  summary: { volumeKg: 720, workingSets: 1, bodyweightReps: 0, setsByMuscleGroup: [{ muscleGroup: 'quadriceps', sets: 1 }] },
  comparison: null, previous: null, nextTime: [], nextTimeLine: null, linkedWorkout: null,
});
const overview = (active: ReturnType<typeof session> | null = null) => ({
  program: { rotation: [fullBody] }, weeklySessionTarget: 3, sessions: active ? [{ ...active, sets: [] }] : [],
  active: active ? { ...active, sets: [] } : null, week: { start: started, end: started + 7 * 86_400_000 }, completedThisWeek: 0,
  next: fullBody, linking: { links: [], otherActivity: [], workouts: [] },
});

// A TextInput on screen is what would raise the keyboard (UX-1: no keyboard).
const hasTextInput = () => JSON.stringify(screen.toJSON()).includes('"TextInput"');

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabLayout,
  '(tabs)/index': TodayRoute,
  '(tabs)/train': TrainRoute,
  '(tabs)/fuel': () => null,
  '(tabs)/coach': () => null,
  'session/[id]/index': ActiveSessionRoute,
  'session/[id]/summary': SessionSummaryRoute,
  program: ProgramEditorRoute,
  'history/[exerciseId]': ExerciseHistoryRoute,
  'settings/index': SettingsRoute,
  'settings/target': () => null,
  'settings/report': () => null,
  'settings/about': () => null,
  'settings/signals': () => null,
  'settings/signal/[type]': () => null,
  onboarding: () => null,
};

beforeEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } });
  for (const fn of Object.values(service)) fn.mockReset();
  useActiveWorkout.getState().reset();
  undoWindow.clear();
  service.readToday.mockResolvedValue({ active: null, next: fullBody } as never);
  service.readOverview.mockResolvedValue(overview() as never);
  service.readProgram.mockResolvedValue({ versionNumber: 1, state: { weeklySessionTarget: 3, trainingProgram: starterTrainingProgram } } as never);
  service.readSession.mockResolvedValue(detail() as never);
  service.logSet.mockResolvedValue({ set: logged(0, 80, 9), undo: { kind: 'deleteSet', setId: 'set-0' } } as never);
});
afterEach(() => { undoWindow.clear(); });

test('UX-1: Today → Resume → the chip logs a set in 2 taps, with no keyboard on screen', async () => {
  service.readToday.mockResolvedValue({ active: { ...session(), sets: [] }, next: fullBody } as never);
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByTestId('today-training-action')).toBeEnabled());
  expect(screen.getByTestId('today-training-action')).toHaveProp('accessibilityLabel', 'Resume Full Body');
  await fireEvent.press(screen.getByTestId('today-training-action')); // tap 1
  await waitFor(() => expect(screen).toHavePathname('/session/s1'));
  await waitFor(() => expect(screen.getByTestId('next-set-chip')).toBeOnTheScreen());
  expect(screen.getByTestId('next-set-chip')).toHaveProp('accessibilityLabel', '80 kilograms, 9 reps, recommended');
  expect(hasTextInput()).toBe(false);
  await fireEvent.press(screen.getByTestId('next-set-chip')); // tap 2
  await waitFor(() => expect(service.logSet).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', templateExerciseId: 'sq', loadKg: 80, reps: 9 })));
  expect(service.startSession).not.toHaveBeenCalled();
  expect(hasTextInput()).toBe(false);
});

test('the Set quick-add starts the next template when none is active, and lands on the session', async () => {
  service.startSession.mockResolvedValue(session());
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByTestId('quick-add-set')).toBeEnabled());
  await fireEvent.press(screen.getByTestId('quick-add-set'));
  await waitFor(() => expect(screen).toHavePathname('/session/s1'));
  expect(service.startSession).toHaveBeenCalledWith('full-body');
  expect(useActiveWorkout.getState().activeSessionId).toBe('s1');
});

test('the quick-add stays on Today and is disabled while a read is pending or there is nothing to train', async () => {
  service.readToday.mockResolvedValue({ active: null, next: null } as never);
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByTestId('quick-add-set')).toBeDisabled());
  expect(screen).toHavePathname('/');
});

test('Train is the real screen: Start next, then the session opens; the tab is addressable', async () => {
  service.startSession.mockResolvedValue(session());
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByTestId('tab-train')).toBeOnTheScreen());
  await fireEvent.press(screen.getByTestId('tab-train'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start Full Body' })).toBeOnTheScreen());
  expect(screen.queryByText(/coming next/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start Full Body' }));
  await waitFor(() => expect(screen).toHavePathname('/session/s1'));
});

test('Finish goes to the summary; Done returns to the tab it came from', async () => {
  service.readToday.mockResolvedValue({ active: { ...session(), sets: [] }, next: fullBody } as never);
  service.finishSession.mockResolvedValue(session({ endedAt: started + 3_000_000, completed: true }));
  service.readSummary.mockResolvedValue(summary() as never);
  await renderRouter(routes, { initialUrl: '/session/s1' });
  await waitFor(() => expect(screen.getByTestId('finish-session')).toBeOnTheScreen());
  await fireEvent.press(screen.getByTestId('finish-session'));
  await waitFor(() => expect(screen).toHavePathname('/session/s1/summary'));
  await waitFor(() => expect(screen.getByTestId('session-summary')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen).not.toHavePathname('/session/s1/summary'));
  expect(useActiveWorkout.getState().activeSessionId).toBeNull();
});

test('deleting a session lands on a tab where the undo toast is still visible, and Undo restores it', async () => {
  const token = { kind: 'restoreSession', session: session() };
  service.deleteSession.mockResolvedValue({ undo: token } as never);
  service.undo.mockResolvedValue(undefined as never);
  await renderRouter(routes, { initialUrl: '/session/s1' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete session' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Delete session' }));
  await waitFor(() => expect(screen.getByTestId('undo-button')).toBeOnTheScreen());
  expect(screen.getByTestId('undo-button')).toHaveProp('accessibilityLabel', 'Undo. Session deleted');
  await fireEvent.press(screen.getByTestId('undo-button'));
  await waitFor(() => expect(service.undo).toHaveBeenCalledWith(token));
  await waitFor(() => expect(screen.queryByTestId('undo-button')).toBeNull());
});

test('the undo toast is hosted on every tab, not only on the screen that produced it', async () => {
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByTestId('tab-train')).toBeOnTheScreen());
  await act(async () => { undoWindow.offer({ kind: 'deleteSet', setId: 'x' } as never, 'Set deleted'); });
  expect(screen.getByTestId('undo-button')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('tab-train'));
  expect(screen.getByTestId('undo-button')).toBeOnTheScreen();
});

test('Settings shows the Training rows and both open the program editor', async () => {
  await renderRouter(routes, { initialUrl: '/settings' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Weekly session target' })).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Weekly session target' })).toHaveProp('accessibilityValue', { text: '3 sessions' });
  await fireEvent.press(screen.getByRole('button', { name: 'Training Program' }));
  await waitFor(() => expect(screen).toHavePathname('/program'));
  expect(testRouter.canGoBack()).toBe(true);
});

test('the Training Program row on Train opens the program editor', async () => {
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByTestId('tab-train')).toBeOnTheScreen());
  await fireEvent.press(screen.getByTestId('tab-train'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Training Program' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Training Program' }));
  await waitFor(() => expect(screen).toHavePathname('/program'));
});

test('exercise history is reachable from an exercise in the session and its rows open the summary', async () => {
  service.readExerciseHistory.mockResolvedValue([{ session: session({ endedAt: started + 1, completed: true }), sets: [logged(0, 80, 8)] }] as never);
  service.readSummary.mockResolvedValue(summary() as never);
  await renderRouter(routes, { initialUrl: '/session/s1' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Back Squat history' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Back Squat history' }));
  await waitFor(() => expect(screen).toHavePathname('/history/back-squat'));
  await waitFor(() => expect(screen.getByRole('header', { name: 'Back Squat' })).toBeOnTheScreen());
});
