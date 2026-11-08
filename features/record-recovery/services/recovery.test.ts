import * as SplashScreen from 'expo-splash-screen';
import { openRecord, rawDatabaseUri, restoreSnapshot } from '@/lib/persistence';
import { eraseAll, nativeShare, resumePendingErase, sweepExportStaging } from '@/features/data';
import { recoveryService } from './recovery';

jest.mock('@/lib/persistence', () => ({ openRecord: jest.fn(), eraseRecord: jest.fn(), restoreSnapshot: jest.fn(), rawDatabaseUri: jest.fn() }));
jest.mock('@/features/data', () => ({ nativeShare: { share: jest.fn() }, eraseAll: jest.fn(), resumePendingErase: jest.fn(), sweepExportStaging: jest.fn() }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hideAsync: jest.fn(async () => {}) }));

beforeEach(() => { jest.clearAllMocks(); jest.mocked(resumePendingErase).mockResolvedValue({ ok: true }); });
test('the share adapter receives only the raw database URI and failures stay typed', async () => {
  jest.mocked(rawDatabaseUri).mockResolvedValue('file:///app/Motive/record.sqlite');
  jest.mocked(nativeShare.share).mockResolvedValue({ ok: true });
  expect(await recoveryService.share()).toEqual({ ok: true });
  expect(nativeShare.share).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///app/Motive/record.sqlite' }));
  jest.mocked(nativeShare.share).mockResolvedValue({ ok: false, code: 'sharingUnavailable' });
  expect(await recoveryService.share()).toEqual({ ok: false, code: 'sharingUnavailable' });
  jest.mocked(nativeShare.share).mockRejectedValue(new Error('private native path'));
  expect(await recoveryService.share()).toEqual({ ok: false, code: 'shareFailed' });
});
test('restore and erase map verification failures without exposing paths', async () => {
  jest.mocked(eraseAll).mockResolvedValue({ ok: false, code: 'eraseBlocked' });
  jest.mocked(restoreSnapshot).mockResolvedValue({ ok: false, code: 'snapshotMissing' });
  expect(await recoveryService.erase()).toEqual({ ok: false, code: 'eraseFailed' });
  expect(await recoveryService.restore()).toEqual({ ok: false, code: 'restoreFailed' });
  jest.mocked(eraseAll).mockResolvedValue({ ok: true });
  jest.mocked(restoreSnapshot).mockResolvedValue({ ok: true });
  expect(await recoveryService.erase()).toEqual({ ok: true });
  expect(await recoveryService.restore()).toEqual({ ok: true });
});
test('a successful launch checks pending erase and sweeps staging', async () => {
  jest.mocked(resumePendingErase).mockResolvedValue({ ok: true });
  jest.mocked(sweepExportStaging).mockResolvedValue();
  jest.mocked(openRecord).mockResolvedValue({ status: 'ready', handle: {} as never, snapshotExists: false });
  expect(await recoveryService.open()).toMatchObject({ status: 'ready' });
  expect(resumePendingErase).toHaveBeenCalledTimes(1); expect(sweepExportStaging).toHaveBeenCalledTimes(1);
});
test('a blocked resumed erase never opens SQLite or sweeps files', async () => {
  jest.mocked(resumePendingErase).mockResolvedValue({ ok: false, code: 'eraseBlocked' });
  expect(await recoveryService.open()).toEqual({ status: 'erase-blocked' });
  expect(openRecord).not.toHaveBeenCalled(); expect(sweepExportStaging).not.toHaveBeenCalled();
});
test('unexpected open failures remain typed and splash reveal waits for the gate', async () => {
  jest.mocked(openRecord).mockRejectedValue(new Error('private/path'));
  expect(await recoveryService.open()).toEqual({ status: 'failed', failure: { code: 'openFailed' }, snapshotExists: false });
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  await recoveryService.reveal();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});
