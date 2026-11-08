import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { RecordFailure } from '@/lib/persistence';
import { recoveryService } from '../services/recovery';
import { useRecordGate } from './useRecordGate';
import { useRecordRecovery } from './useRecordRecovery';
import { useRecordLifecycle } from '@/store/record-lifecycle';

jest.mock('@/features/data', () => ({ aiRetentionNotice: 'Data already sent to the AI provider for coaching or food recognition is kept by them for up to 30 days for abuse monitoring, or longer if flagged, and Motive can’t recall it. Motive’s server keeps none of your health or chat content.' }));

jest.mock('../services/recovery', () => ({ recoveryService: {
  open: jest.fn(), restore: jest.fn(), erase: jest.fn(), share: jest.fn(), reveal: jest.fn(async () => {}),
} }));
const service = jest.mocked(recoveryService);
const initial = useRecordLifecycle.getState();
const failures: RecordFailure[] = [
  { code: 'openFailed' }, { code: 'integrityFailed' }, { code: 'migrationFailed', from: 0, to: 1 },
  { code: 'newerSchema', found: 2, supported: 1 },
];
beforeEach(() => {
  jest.resetAllMocks();
  useRecordLifecycle.setState(initial, true);
  service.erase.mockImplementation(async () => {
    useRecordLifecycle.getState().beginErase(); useRecordLifecycle.getState().completeErase(); return { ok: true };
  });
  service.restore.mockResolvedValue({ ok: true });
  service.share.mockResolvedValue({ ok: true });
});
async function setup(failure: RecordFailure = failures[0], snapshotExists = false) {
  service.open.mockResolvedValue({ status: 'failed', failure, snapshotExists });
  return renderHook(() => {
    const gate = useRecordGate();
    return { gate, model: useRecordRecovery(gate) };
  });
}

test.each(failures.flatMap((failure) => [false, true].map((snapshot) => ({ failure, snapshot }))))(
  '$failure.code has retry, share and typed erase; restore availability is $snapshot', async ({ failure, snapshot }) => {
    const { result } = await setup(failure, snapshot);
    await waitFor(() => expect(result.current.gate.status).toBe('recovery'));
    expect(result.current.model.title).not.toBe('');
    expect(result.current.model.body).toMatch(/not been|Nothing has been/);
    expect(result.current.model.snapshotExists).toBe(snapshot);
    expect(result.current.model.retry).toEqual(expect.any(Function));
    await act(() => result.current.model.chooseRestore());
    expect(result.current.model.step).toBe(snapshot ? 'restore' : 'actions');
    await act(() => result.current.model.chooseShare());
    expect(result.current.model.step).toBe('share');
    expect(result.current.model.warning).toMatch(/not encrypted.*health data/);
    expect(service.share).not.toHaveBeenCalled();
    await act(() => result.current.model.chooseErase());
    expect(result.current.model.canErase).toBe(false);
    expect(service.erase).not.toHaveBeenCalled();
    if (failure.code === 'newerSchema') expect(result.current.model.body).toMatch(/Install that build or a newer one. Nothing has been changed or deleted/);
  },
);

test('erase requires the exact case-sensitive phrase, calls once and reopens after success', async () => {
  const { result } = await setup();
  await act(() => result.current.model.chooseErase());
  for (const text of ['', 'erase', 'ERAS', 'ERASE NOW']) {
    await act(() => result.current.model.setConfirmation(text));
    expect(result.current.model.canErase).toBe(false);
    await act(() => result.current.model.confirmErase());
  }
  expect(service.erase).not.toHaveBeenCalled();
  await act(() => result.current.model.setConfirmation(' ERASE '));
  expect(result.current.model.canErase).toBe(true);
  expect(result.current.model.warning).toContain('Data already sent to the AI provider for coaching or food recognition');
  service.open.mockResolvedValue({ status: 'ready', handle: {} as never, snapshotExists: false });
  await act(() => result.current.model.confirmErase());
  expect(service.erase).toHaveBeenCalledTimes(1);
  expect(service.open).toHaveBeenCalledTimes(2);
  expect(result.current.gate.status).toBe('ready');
});

test('an erase outside Recovery invalidates the gate until exactly one fresh open completes', async () => {
  service.open.mockResolvedValue({ status: 'ready', handle: {} as never, snapshotExists: false });
  const { result } = await renderHook(() => useRecordGate());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  let finish!: (value: Awaited<ReturnType<typeof recoveryService.open>>) => void;
  service.open.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await act(() => { useRecordLifecycle.getState().beginErase(); useRecordLifecycle.getState().completeErase(); });
  expect(result.current.status).toBe('opening');
  expect(service.open).toHaveBeenCalledTimes(2);
  await act(() => finish({ status: 'ready', handle: {} as never, snapshotExists: false }));
  expect(result.current.status).toBe('ready'); expect(service.open).toHaveBeenCalledTimes(2);
});

test('launch resume completes its own erase without triggering a second open', async () => {
  service.open.mockImplementationOnce(async () => {
    useRecordLifecycle.getState().beginErase(); useRecordLifecycle.getState().completeErase(false);
    return { status: 'ready', handle: {} as never, snapshotExists: false };
  });
  const { result } = await renderHook(() => useRecordGate());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(service.open).toHaveBeenCalledTimes(1);
});

test('blocked launch stays non-ready, reveals the root blocker, and Retry success reopens once', async () => {
  service.open.mockImplementationOnce(async () => {
    useRecordLifecycle.getState().beginErase(); useRecordLifecycle.getState().blockErase(); return { status: 'erase-blocked' };
  });
  const { result } = await renderHook(() => useRecordGate());
  expect(result.current.status).toBe('opening');
  await waitFor(() => expect(service.reveal).toHaveBeenCalled());
  service.open.mockResolvedValue({ status: 'ready', handle: {} as never, snapshotExists: false });
  await act(() => { useRecordLifecycle.getState().beginErase(); useRecordLifecycle.getState().completeErase(); });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(service.open).toHaveBeenCalledTimes(2);
});

test('restore warns about discarded writes, requires confirmation, then reopens', async () => {
  const { result } = await setup(failures[2], true);
  await act(() => result.current.model.chooseRestore());
  expect(service.restore).not.toHaveBeenCalled();
  expect(result.current.model.warning).toMatch(/discards anything written after the snapshot/);
  service.open.mockResolvedValue({ status: 'ready', handle: {} as never, snapshotExists: false });
  await act(() => result.current.model.confirmRestore());
  expect(service.restore).toHaveBeenCalledTimes(1);
  expect(service.open).toHaveBeenCalledTimes(2);
  expect(result.current.gate.status).toBe('ready');
});

test('failed erase honestly stays in recovery without reopening', async () => {
  service.erase.mockResolvedValue({ ok: false, code: 'eraseFailed' });
  const { result } = await setup();
  await act(() => result.current.model.chooseErase());
  await act(() => result.current.model.setConfirmation('ERASE'));
  await act(() => result.current.model.confirmErase());
  expect(result.current.model.error).toMatch(/Couldn’t verify that all data was erased/);
  expect(result.current.gate.status).toBe('recovery');
  expect(service.open).toHaveBeenCalledTimes(1);
});

test('share requires the warning step and reports an unavailable share sheet', async () => {
  const { result } = await setup();
  await act(() => result.current.model.confirmShare());
  expect(service.share).not.toHaveBeenCalled();
  await act(() => result.current.model.chooseShare());
  expect(result.current.model.warning).toMatch(/not encrypted/);
  service.share.mockResolvedValue({ ok: false, code: 'sharingUnavailable' });
  await act(() => result.current.model.confirmShare());
  expect(service.share).toHaveBeenCalledTimes(1);
  expect(result.current.model.error).toMatch(/Sharing isn’t available/);
});

test('pending erase disables confirmation and ignores a second submission', async () => {
  let finish!: (value: { ok: true }) => void;
  service.erase.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = await setup();
  await act(() => result.current.model.chooseErase());
  await act(() => result.current.model.setConfirmation('ERASE'));
  let pending: Promise<void> | undefined;
  await act(() => { pending = result.current.model.confirmErase(); });
  expect(result.current.model.busy).toBe(true);
  expect(result.current.model.canErase).toBe(false);
  await act(() => result.current.model.confirmErase());
  expect(service.erase).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ ok: true }); await pending; });
  expect(result.current.model.busy).toBe(false);
});

test('the gate stays opening until open completes; retry repeats the normal open path', async () => {
  let finish!: (value: Awaited<ReturnType<typeof recoveryService.open>>) => void;
  service.open.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = await renderHook(() => useRecordGate());
  expect(result.current.status).toBe('opening');
  expect(service.reveal).not.toHaveBeenCalled();
  await act(() => finish({ status: 'failed', failure: failures[0], snapshotExists: false }));
  expect(result.current.status).toBe('recovery');
  expect(service.reveal).toHaveBeenCalled();
  service.open.mockResolvedValue({ status: 'ready', handle: {} as never, snapshotExists: false });
  await act(() => result.current.retry());
  expect(result.current.status).toBe('ready');
});
