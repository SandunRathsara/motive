import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { planStore, planKeys, createPlanRepository, type PlanVersion } from '@/features/plan';
import { createProfileRepository, profileKeys } from '@/features/profile';
import { getTrendWeight, getLatestKnownTrendWeight } from '@/features/health';
import { useEditGoal, useEditKcalTarget, useEditProteinFloor } from './useNutritionEdits';
import { useNutritionTargetEditor } from './useNutritionTargetEditor';

jest.mock('@/features/plan', () => ({ ...jest.requireActual('@/features/plan'), createPlanRepository: jest.fn() }));
jest.mock('@/features/profile', () => ({ ...jest.requireActual('@/features/profile'), createProfileRepository: jest.fn() }));
jest.mock('@/features/health', () => ({ getTrendWeight: jest.fn(), getLatestKnownTrendWeight: jest.fn() }));
const version = { number: 1, snapshot: { goal: 'fatLoss', ratePreset: -0.5, kcalTarget: 2250, kcalOrigin: 'startingEstimate', proteinFloorG: 144, proteinBasisWeightKg: 80 } } as PlanVersion;
const clients: QueryClient[] = [];
async function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always', gcTime: Infinity }, mutations: { retry: false, networkMode: 'always', gcTime: Infinity } } });
  clients.push(client);
  client.setQueryData(planKeys.current, version);
  client.setQueryData(planKeys.versions, [version]);
  client.setQueryData(profileKeys.current, { weightKg: 80 });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { client, ...await renderHook(hook, { wrapper }) };
}
beforeEach(() => {
  jest.spyOn(planStore, 'current').mockResolvedValue({ status: 'present', version, skippedCount: 0 });
  jest.spyOn(planStore, 'appendVersion').mockResolvedValue({ version: { ...version, number: 2 }, changedFields: ['kcalTarget'] });
  jest.mocked(createProfileRepository).mockReturnValue({ read: async () => ({ profile: { sex: 'male', age: 30, heightCm: 180, weightKg: 80 }, skippedCount: 0 }) } as ReturnType<typeof createProfileRepository>);
  jest.mocked(createPlanRepository).mockReturnValue({ readStartingEstimate: async () => ({ estimate: { valueKcal: 2670 }, skippedCount: 0 }) } as ReturnType<typeof createPlanRepository>);
  jest.mocked(getTrendWeight).mockResolvedValue({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
  jest.mocked(getLatestKnownTrendWeight).mockResolvedValue({ known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } });
});
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); jest.restoreAllMocks(); jest.clearAllMocks(); });

test('a Settings kcal mutation commits through the plan service and invalidates the plan root, not Profile', async () => {
  const { result, client } = await setup(useEditKcalTarget);
  await act(async () => { await result.current.mutateAsync(2400); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(planStore.appendVersion).toHaveBeenCalledWith('Your edit', { kcalTarget: 2400, kcalOrigin: 'yourEdit' });
  expect(client.getQueryState(planKeys.current)?.isInvalidated).toBe(true);
  expect(client.getQueryState(planKeys.versions)?.isInvalidated).toBe(true);
  expect(client.getQueryState(profileKeys.current)?.isInvalidated).toBe(false);
});

test('a Settings Goal edit exposes a clamp notice after commit and invalidates the plan root', async () => {
  jest.mocked(getTrendWeight).mockResolvedValue({ known: true, value: 180, provenance: [], coverage: { known: 1, of: 7, unit: 'days' } });
  const { result, client } = await setup(useEditGoal);
  await act(async () => { await result.current.mutateAsync({ goal: 'fatLoss', ratePreset: -0.75 }); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(planStore.appendVersion).toHaveBeenCalledWith('Your edit', { goal: 'fatLoss', ratePreset: -0.75, kcalTarget: 2780 });
  expect(result.current.noticeText).toMatch(/rate.*not reachable.*2,780.*−0.5%/);
  expect(client.getQueryState(planKeys.current)?.isInvalidated).toBe(true);
});

test('a Settings protein edit saves directly through the plan contract and invalidates the plan root', async () => {
  const { result, client } = await setup(useEditProteinFloor);
  await act(async () => { await result.current.mutateAsync(160); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(planStore.appendVersion).toHaveBeenCalledWith('Your edit', { proteinFloorG: 160, proteinBasisWeightKg: 80 });
  expect(client.getQueryState(planKeys.current)?.isInvalidated).toBe(true);
});

test('a floor refusal shows its number and reason, preserves the cached plan, then a corrected save succeeds', async () => {
  const { result, client } = await setup(useEditKcalTarget);
  await act(async () => { await expect(result.current.mutateAsync(1200)).rejects.toMatchObject({ code: 'belowFloor' }); });
  await waitFor(() => expect(result.current.errorText).toMatch(/1,780 kcal.*BMR at your reference weight.*Nothing was saved/));
  expect(planStore.appendVersion).not.toHaveBeenCalled();
  expect(client.getQueryState(planKeys.current)?.isInvalidated).toBe(false);
  await act(async () => { await result.current.mutateAsync(2400); });
  await waitFor(() => expect(result.current.errorText).toBeUndefined());
  expect(result.current.isSuccess).toBe(true);
});

test('a failed plan commit is never reported saved or invalidated, and provider details are not exposed', async () => {
  jest.mocked(planStore.appendVersion).mockRejectedValue(new Error('private record.sqlite value'));
  const { result, client } = await setup(useEditProteinFloor);
  await act(async () => { await expect(result.current.mutateAsync(160)).rejects.toThrow(); });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.errorText).toBe("Couldn't save your edit. Nothing was saved. Try again.");
  expect(result.current.isSuccess).toBe(false);
  expect(client.getQueryState(planKeys.current)?.isInvalidated).toBe(false);
});

test('the Goal form hydrates from the record, switches Goal with its default preset, and submits the selected pair', async () => {
  jest.mocked(planStore.current).mockResolvedValue({ status: 'present', skippedCount: 0,
    version: { ...version, snapshot: { ...version.snapshot, goal: 'maintenance', ratePreset: null } },
  });
  const { result } = await setup(() => useNutritionTargetEditor('goal'));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.goal).toMatchObject({ value: 'maintenance', rate: null, rates: [] });
  await act(() => result.current.goal.selectGoal('muscleGain'));
  expect(result.current.goal).toMatchObject({ value: 'muscleGain', rate: 0.25 });
  await act(() => result.current.goal.selectRate(0.4));
  await act(() => result.current.goal.save());
  await waitFor(() => expect(result.current.saved).toBe(true));
  expect(planStore.appendVersion).toHaveBeenCalledWith('Your edit', { goal: 'muscleGain', ratePreset: 0.4, kcalTarget: 3000 });
});
