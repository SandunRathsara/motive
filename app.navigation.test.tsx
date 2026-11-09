// Keep Router integration tests outside app/ so they cannot become filesystem routes.
import { act, fireEvent, renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import RootLayout from './app/_layout';
import TabLayout from './app/(tabs)/_layout';
import TodayRoute from './app/(tabs)';
import SettingsRoute from './app/settings';
import OnboardingRoute from './app/onboarding';
import { useRecordLifecycle } from './store/record-lifecycle';
import { queryClient } from './lib/query/client';

let mockGateStatus: 'opening' | 'ready' = 'ready';
let mockOnboardingStatus: 'none' | 'present' | 'invalid' = 'present';
const mockRetry = jest.fn();
jest.mock('./global.css', () => ({}));
jest.mock('@/features/record-recovery', () => ({
  ...jest.requireActual('@/features/record-recovery'),
  useRecordGate: () => ({ status: mockGateStatus, snapshotExists: true, retry: jest.fn(), restore: jest.fn(), erase: jest.fn(), share: jest.fn() }),
}));
jest.mock('./features/onboarding/services/read-onboarding-status', () => ({ readOnboardingStatus: async () => ({ status: mockOnboardingStatus, skippedCount: mockOnboardingStatus === 'invalid' ? 2 : 0 }) }));
jest.mock('./features/onboarding/services/complete-onboarding', () => ({
  ...jest.requireActual('./features/onboarding/services/complete-onboarding'),
  completeOnboarding: async () => { mockOnboardingStatus = 'present'; return {}; },
}));
jest.mock('@/features/metrics', () => ({ useUncleanExitTracking: jest.fn() }));
// Today and Settings now read training state; training screens are covered in app.training.test.tsx.
jest.mock('./features/workouts/services/workout-service', () => ({
  workoutService: {
    readToday: async () => ({ active: null, next: null }),
    readProgram: async () => ({ versionNumber: 1, state: { weeklySessionTarget: 3, trainingProgram: { rotation: [] } } }),
  },
}));
jest.mock('@/features/data', () => ({
  useEraseLifecycle: () => ({
    phase: jest.requireActual<typeof import('./store/record-lifecycle')>('./store/record-lifecycle').useRecordLifecycle((state) => state.phase),
    paused: null, retry: mockRetry,
  }),
  useDataExport: () => {
    // Fails immediately if Settings is not inside the root QueryClientProvider.
    jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query').useQueryClient();
    return { step: 'idle', begin: jest.fn() };
  },
  useDeleteAllData: () => ({ step: 'idle', begin: jest.fn() }),
  useFaultInjection: () => ({ available: false }),
}));

beforeEach(() => {
  mockGateStatus = 'ready';
  mockOnboardingStatus = 'present';
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } });
  mockRetry.mockClear();
  useRecordLifecycle.setState({ phase: 'ready', eraseGeneration: 0 });
});

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabLayout,
  '(tabs)/index': TodayRoute,
  '(tabs)/train': () => <Text>Train screen</Text>,
  '(tabs)/fuel': () => <Text>Fuel placeholder</Text>,
  '(tabs)/coach': () => <Text>Coach placeholder</Text>,
  'session/[id]/index': () => <Text>Session view</Text>,
  'session/[id]/summary': () => <Text>Summary view</Text>,
  program: () => <Text>Program view</Text>,
  'history/[exerciseId]': () => <Text>History view</Text>,
  'settings/index': SettingsRoute,
  'settings/about': () => <Text>About view</Text>,
  'settings/report': () => <Text>Report view</Text>,
  'settings/signals': () => <Text>Signals view</Text>,
  'settings/signal/[type]': () => <Text>Signal detail</Text>,
  onboarding: OnboardingRoute,
};
async function startOnboarding() {
  await fireEvent.press(screen.getByRole('radio', { name: 'Male' }));
  await fireEvent.changeText(screen.getByLabelText('Age (years)'), '30');
  await fireEvent.changeText(screen.getByLabelText('Height (cm)'), '180');
  await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '80');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
}

test('erase blocks before opening, retries when blocked, and clears Settings history after each verified erase', async () => {
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen());
  for (let attempt = 0; attempt < 2; attempt++) {
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    await fireEvent.press(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByText('About view')).toBeOnTheScreen();
    mockGateStatus = 'opening';
    await act(() => { useRecordLifecycle.getState().beginErase(); });
    expect(screen.getByRole('header', { name: 'Deleting your data…' })).toBeOnTheScreen();
    expect(screen.queryByText('About view')).toBeNull();
    await act(() => { useRecordLifecycle.getState().blockErase(); });
    expect(screen.getByRole('header', { name: 'Deletion not finished' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRetry).toHaveBeenCalledTimes(attempt + 1);
    mockGateStatus = 'ready';
    mockOnboardingStatus = 'none';
    await act(() => { useRecordLifecycle.getState().completeErase(); });
    await waitFor(() => expect(screen).toHavePathname('/onboarding'));
    expect(screen.getByRole('header', { name: 'About you' })).toBeOnTheScreen();
    expect(testRouter.canGoBack()).toBe(false);
    expect(screen.queryByText('About view')).toBeNull();
    if (attempt === 0) await startOnboarding();
  }
});

test('a launch-resumed erase returns to onboarding even without a generation bump', async () => {
  mockGateStatus = 'opening';
  useRecordLifecycle.setState({ phase: 'erasing' });
  await renderRouter(routes, { initialUrl: '/settings/about' });
  expect(screen.getByRole('header', { name: 'Deleting your data…' })).toBeOnTheScreen();
  mockGateStatus = 'ready';
  mockOnboardingStatus = 'none';
  await act(() => { useRecordLifecycle.getState().completeErase(false); });
  await waitFor(() => expect(screen).toHavePathname('/onboarding'));
  expect(screen.getByRole('header', { name: 'About you' })).toBeOnTheScreen();
  expect(testRouter.canGoBack()).toBe(false);
});

test('exporting leaves Settings mounted but disables overlapping data operations', async () => {
  await renderRouter(routes, { initialUrl: '/settings' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export data' })).toBeOnTheScreen());
  await act(() => { useRecordLifecycle.getState().beginExport(); });
  expect(screen).toHavePathname('/settings');
  expect(screen.getByRole('button', { name: 'Export data' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Delete all data' })).toBeDisabled();
  expect(screen.queryByRole('header', { name: 'Deleting your data…' })).toBeNull();
  await act(() => { useRecordLifecycle.getState().endExport(); });
  expect(screen.getByRole('button', { name: 'Export data' })).toBeEnabled();
});

test('a fresh record is onboarding, Start lands on Today and cannot navigate back into onboarding', async () => {
  mockOnboardingStatus = 'none';
  await renderRouter(routes);
  await waitFor(() => expect(screen).toHavePathname('/onboarding'));
  await startOnboarding();
  expect(screen.getByRole('tab', { name: 'Today', selected: true })).toBeOnTheScreen();
  expect(testRouter.canGoBack()).toBe(false);
});
test('invalid setup rows render Recovery with a count and existing actions, never onboarding', async () => {
  mockOnboardingStatus = 'invalid';
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByRole('header', { name: 'Your record needs attention' })).toBeOnTheScreen());
  expect(screen.getByText(/2 invalid rows skipped/)).toBeOnTheScreen();
  expect(screen.queryByRole('header', { name: 'About you' })).toBeNull();
  for (const name of ['Retry', 'Share raw database', 'Restore snapshot', 'Erase and start over']) expect(screen.getByRole('button', { name })).toBeEnabled();
});

test('inline validation blocks progress; Goal defaults, Maintenance and Back preserve the draft', async () => {
  mockOnboardingStatus = 'none';
  await renderRouter(routes);
  await waitFor(() => expect(screen.getByRole('header', { name: 'About you' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Choose female or male for the starting estimate.')).toHaveProp('accessibilityRole', 'alert');
  await fireEvent.press(screen.getByRole('radio', { name: 'Female' }));
  for (const [label, value] of [['Age (years)', '17'], ['Height (cm)', '119'], ['Weight (kg)', '34']]) await fireEvent.changeText(screen.getByLabelText(label), value);
  expect(screen.getByText('Enter an age from 18 to 90 in whole years.')).toBeOnTheScreen();
  expect(screen.getByText('Enter a height in cm from 120 to 230.')).toBeOnTheScreen();
  expect(screen.getByText('Enter a weight in kg from 35 to 250.')).toBeOnTheScreen();
  for (const [label, value] of [['Age (years)', '30'], ['Height (cm)', '180'], ['Weight (kg)', '80']]) await fireEvent.changeText(screen.getByLabelText(label), value);
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('radio', { name: '−0.5% per week', checked: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: 'Maintenance' }));
  expect(screen.queryByRole('radiogroup', { name: 'Rate per week' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByLabelText('Weight (kg)')).toHaveDisplayValue('80');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('radio', { name: 'Maintenance', checked: true })).toBeOnTheScreen();
});
