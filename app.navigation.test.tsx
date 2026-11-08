// Keep Router integration tests outside app/ so they cannot become filesystem routes.
import { act, fireEvent, renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import RootLayout from './app/_layout';
import TabLayout from './app/(tabs)/_layout';
import TodayRoute from './app/(tabs)';
import SettingsRoute from './app/settings';
import { useRecordLifecycle } from './store/record-lifecycle';

let mockGateStatus: 'opening' | 'ready' = 'ready';
const mockRetry = jest.fn();
jest.mock('./global.css', () => ({}));
jest.mock('@/features/record-recovery', () => ({
  useRecordGate: () => ({ status: mockGateStatus }), useRecordRecovery: () => ({}),
}));
jest.mock('@/features/metrics', () => ({ useUncleanExitTracking: jest.fn() }));
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
  mockRetry.mockClear();
  useRecordLifecycle.setState({ phase: 'ready', eraseGeneration: 0 });
});

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabLayout,
  '(tabs)/index': TodayRoute,
  '(tabs)/train': () => <Text>Train placeholder</Text>,
  '(tabs)/fuel': () => <Text>Fuel placeholder</Text>,
  '(tabs)/coach': () => <Text>Coach placeholder</Text>,
  'settings/index': SettingsRoute,
  'settings/about': () => <Text>About view</Text>,
  'settings/report': () => <Text>Report view</Text>,
};

test('erase blocks before opening, retries when blocked, and clears Settings history after each verified erase', async () => {
  await renderRouter(routes);
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
    await act(() => { useRecordLifecycle.getState().completeErase(); });
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(screen.getByRole('tab', { name: 'Today', selected: true })).toBeOnTheScreen();
    expect(testRouter.canGoBack()).toBe(false);
    expect(screen.queryByText('About view')).toBeNull();
  }
});

test('a launch-resumed erase returns to Today even without a generation bump', async () => {
  mockGateStatus = 'opening';
  useRecordLifecycle.setState({ phase: 'erasing' });
  await renderRouter(routes, { initialUrl: '/settings/about' });
  expect(screen.getByRole('header', { name: 'Deleting your data…' })).toBeOnTheScreen();
  mockGateStatus = 'ready';
  await act(() => { useRecordLifecycle.getState().completeErase(false); });
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(screen.getByRole('tab', { name: 'Today', selected: true })).toBeOnTheScreen();
  expect(testRouter.canGoBack()).toBe(false);
});

test('exporting leaves Settings mounted but disables overlapping data operations', async () => {
  await renderRouter(routes, { initialUrl: '/settings' });
  await act(() => { useRecordLifecycle.getState().beginExport(); });
  expect(screen).toHavePathname('/settings');
  expect(screen.getByRole('button', { name: 'Export data' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Delete all data' })).toBeDisabled();
  expect(screen.queryByRole('header', { name: 'Deleting your data…' })).toBeNull();
  await act(() => { useRecordLifecycle.getState().endExport(); });
  expect(screen.getByRole('button', { name: 'Export data' })).toBeEnabled();
});
