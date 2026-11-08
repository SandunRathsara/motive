import * as SplashScreen from 'expo-splash-screen';
import { eraseRecord, openRecord, rawDatabaseUri, restoreSnapshot } from '@/lib/persistence';
import { nativeShare } from '@/features/data';
import { recoveryService } from './recovery';

jest.mock('@/lib/persistence', () => ({ openRecord: jest.fn(), eraseRecord: jest.fn(), restoreSnapshot: jest.fn(), rawDatabaseUri: jest.fn() }));
jest.mock('@/features/data', () => ({ nativeShare: { share: jest.fn() } }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hideAsync: jest.fn(async () => {}) }));

beforeEach(() => jest.clearAllMocks());
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
  jest.mocked(eraseRecord).mockResolvedValue({ ok: false, remaining: ['private/path'] });
  jest.mocked(restoreSnapshot).mockResolvedValue({ ok: false, code: 'snapshotMissing' });
  expect(await recoveryService.erase()).toEqual({ ok: false, code: 'eraseFailed' });
  expect(await recoveryService.restore()).toEqual({ ok: false, code: 'restoreFailed' });
  jest.mocked(eraseRecord).mockResolvedValue({ ok: true });
  jest.mocked(restoreSnapshot).mockResolvedValue({ ok: true });
  expect(await recoveryService.erase()).toEqual({ ok: true });
  expect(await recoveryService.restore()).toEqual({ ok: true });
});
test('unexpected open failures remain typed and splash reveal waits for the gate', async () => {
  jest.mocked(openRecord).mockRejectedValue(new Error('private/path'));
  expect(await recoveryService.open()).toEqual({ status: 'failed', failure: { code: 'openFailed' }, snapshotExists: false });
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  await recoveryService.reveal();
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});
