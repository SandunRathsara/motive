import { renderHook, waitFor } from '@testing-library/react-native';
import { queryClient } from '@/lib/query/client';
import type { RecordGate } from '@/features/record-recovery';
import { readOnboardingStatus } from '../services/read-onboarding-status';
import { useOnboardingGate } from './useOnboardingGate';

jest.mock('../services/read-onboarding-status', () => ({ readOnboardingStatus: jest.fn() }));
const record = { status: 'ready', snapshotExists: true, retry: jest.fn(), restore: jest.fn(), erase: jest.fn(), share: jest.fn() } as unknown as RecordGate;
beforeAll(() => queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } }));
beforeEach(() => { queryClient.clear(); jest.clearAllMocks(); });
afterEach(() => queryClient.clear());
test.each(['none', 'present'] as const)('%s is routed only after the opened record has been checked, without a provider trap', async (status) => {
  jest.mocked(readOnboardingStatus).mockResolvedValue({ status, skippedCount: 0 });
  const { result } = await renderHook(() => useOnboardingGate(record));
  await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', onboardingStatus: status }));
});
test.each([0, 2])('partial or invalid rows lead to typed Recovery, preserving the snapshot (count %s)', async (skippedCount) => {
  jest.mocked(readOnboardingStatus).mockResolvedValue({ status: 'invalid', skippedCount });
  const { result } = await renderHook(() => useOnboardingGate(record));
  await waitFor(() => expect(result.current).toMatchObject({ status: 'recovery', failure: { code: 'invalidRows', skippedCount }, snapshotExists: true }));
});
test('a failed status read is Recovery, never onboarding', async () => {
  jest.mocked(readOnboardingStatus).mockRejectedValue(new Error('private'));
  const { result } = await renderHook(() => useOnboardingGate(record));
  await waitFor(() => expect(result.current).toMatchObject({ status: 'recovery', failure: { code: 'readFailed' } }));
});
test('record opening never reads rows or exposes onboarding', async () => {
  const { result } = await renderHook(() => useOnboardingGate({ ...record, status: 'opening' }));
  expect(result.current.status).toBe('opening');
  expect(readOnboardingStatus).not.toHaveBeenCalled();
});
