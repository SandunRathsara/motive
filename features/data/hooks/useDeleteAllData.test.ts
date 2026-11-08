import { act, renderHook } from '@testing-library/react-native';
import { eraseAll } from '../services/erase';
import { useDeleteAllData } from './useDeleteAllData';

jest.mock('../services/erase', () => ({ eraseAll: jest.fn(async () => ({ ok: true })) }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(eraseAll).mockResolvedValue({ ok: true }); });

test('delete needs disclosures followed by a final confirmation, with no typed phrase', async () => {
  const { result } = await renderHook(() => useDeleteAllData());
  expect(result.current.step).toBe('idle');
  await act(() => result.current.confirm());
  expect(eraseAll).not.toHaveBeenCalled();
  await act(() => result.current.begin());
  expect(result.current.step).toBe('disclosures');
  expect(result.current.disclosures).toContain('Apple Health data');
  expect(result.current.disclosures).toContain('already-shared exports');
  expect(result.current.disclosures).toContain('Data already sent to the AI provider for coaching or food recognition is kept by them for up to 30 days for abuse monitoring, or longer if flagged, and Motive can’t recall it. Motive’s server keeps none of your health or chat content.');
  await act(() => result.current.confirm());
  expect(eraseAll).not.toHaveBeenCalled();
  await act(() => result.current.next());
  expect(result.current.step).toBe('final');
  await act(() => result.current.confirm());
  expect(eraseAll).toHaveBeenCalledTimes(1);
});

test('cancel from either confirmation clears the workflow without erasing', async () => {
  const { result } = await renderHook(() => useDeleteAllData());
  await act(() => result.current.begin());
  await act(() => result.current.cancel());
  expect(result.current.step).toBe('idle');
  await act(() => result.current.begin());
  await act(() => result.current.next());
  await act(() => result.current.cancel());
  expect(result.current.step).toBe('idle');
  expect(eraseAll).not.toHaveBeenCalled();
});

test('erase is single-submit and continues even when Settings unmounts', async () => {
  let finish!: (value: { ok: true }) => void;
  jest.mocked(eraseAll).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result, unmount } = await renderHook(() => useDeleteAllData());
  await act(() => result.current.begin()); await act(() => result.current.next());
  let pending: ReturnType<typeof result.current.confirm>;
  await act(() => { pending = result.current.confirm(); });
  expect(result.current.step).toBe('erasing');
  await act(() => { result.current.cancel(); result.current.begin(); result.current.next(); void result.current.confirm(); });
  expect(result.current.step).toBe('erasing'); expect(eraseAll).toHaveBeenCalledTimes(1);
  await unmount();
  finish({ ok: true });
  expect(await pending!).toEqual({ ok: true });
});

test('a busy record leaves the final confirmation available instead of pretending deletion started', async () => {
  jest.mocked(eraseAll).mockResolvedValue({ ok: false, code: 'busy' });
  const { result } = await renderHook(() => useDeleteAllData());
  await act(() => result.current.begin()); await act(() => result.current.next());
  await act(() => result.current.confirm());
  expect(result.current.step).toBe('final');
});
