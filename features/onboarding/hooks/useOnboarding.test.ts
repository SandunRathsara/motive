import { act, renderHook } from '@testing-library/react-native';
import { queryClient } from '@/lib/query/client';
import { completeOnboarding } from '../services/complete-onboarding';
import { useOnboarding } from './useOnboarding';

jest.mock('../services/complete-onboarding', () => ({
  ...jest.requireActual('../services/complete-onboarding'), completeOnboarding: jest.fn(),
}));
jest.mock('./useHealthPrefill', () => ({ useHealthPrefill: (_active: boolean, onKnown: (value: unknown) => void) => ({ available: true, busy: false, message: null, request: () => onKnown({ weightKg: 80.5, origin: { kind: 'health', sampleTime: 1794110400000, sourceName: 'Scale' } }), cancel: jest.fn() }) }));
beforeAll(() => queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } }));
beforeEach(() => { queryClient.clear(); jest.clearAllMocks(); });
afterEach(() => queryClient.clear());
async function fill(result: { current: ReturnType<typeof useOnboarding> }) {
  await act(() => {
    result.current.chooseSex('male');
    result.current.setText('age', '30'); result.current.setText('heightCm', '180'); result.current.setText('weightKg', '80');
  });
  await act(() => result.current.next());
  await act(() => result.current.next());
}
test('Start navigates only after commit and invalidates plan and profile reads', async () => {
  let finish!: (value: Awaited<ReturnType<typeof completeOnboarding>>) => void;
  jest.mocked(completeOnboarding).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const navigate = jest.fn();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const { result } = await renderHook(() => useOnboarding(navigate));
  await fill(result);
  let pending!: Promise<void>;
  await act(() => { pending = result.current.start(); });
  expect(navigate).not.toHaveBeenCalled(); expect(result.current.busy).toBe(true);
  await act(async () => { finish({} as never); await pending; });
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['plan'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['profile'] });
});
test('a failed commit keeps editable values, says nothing was saved, and can be retried', async () => {
  jest.mocked(completeOnboarding).mockRejectedValue(new Error('private SQLite detail'));
  const navigate = jest.fn();
  const { result } = await renderHook(() => useOnboarding(navigate));
  await fill(result);
  await act(() => result.current.start());
  expect(result.current.errorText).toMatch(/Nothing was saved/);
  expect(navigate).not.toHaveBeenCalled();
  await act(() => result.current.back()); await act(() => result.current.back());
  expect(result.current.fields.find((field) => field.key === 'weightKg')?.value).toBe('80');
  jest.mocked(completeOnboarding).mockResolvedValue({} as never);
  await act(() => result.current.next()); await act(() => result.current.next());
  await act(() => result.current.start());
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(completeOnboarding).toHaveBeenLastCalledWith(expect.objectContaining({ age: 30, heightCm: 180, weightKg: 80 }));
});

test('typing over a Health prefill changes the saved origin to typed', async () => {
  jest.mocked(completeOnboarding).mockRejectedValue(new Error('not saved'));
  const { result } = await renderHook(() => useOnboarding(jest.fn()));
  await act(() => result.current.health.request());
  expect(result.current.health.sourceText).toMatch(/Scale.*latest sample/);
  await act(() => result.current.setText('weightKg', '81'));
  expect(result.current.health.sourceText).toBeNull();
  await fill(result);
  await act(() => result.current.start());
  expect(completeOnboarding).toHaveBeenCalledWith(expect.objectContaining({ weightOrigin: { kind: 'typed' } }));
});
