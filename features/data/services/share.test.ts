import * as Sharing from 'expo-sharing';
import { nativeShare } from './share';

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
const request = { uri: 'file:///app/Motive/export-staging/motive-export-2026-11-08.json', mimeType: 'application/json', uti: 'public.json', dialogTitle: 'Export' };

beforeEach(() => jest.clearAllMocks());
test('the share sheet receives the file and resolves once it closes', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
  expect(await nativeShare.share(request)).toEqual({ ok: true });
  expect(Sharing.shareAsync).toHaveBeenCalledWith(request.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export' });
});
test('unavailable sharing and native failures are typed without native detail', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
  expect(await nativeShare.share(request)).toEqual({ ok: false, code: 'sharingUnavailable' });
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockRejectedValue(new Error('private native path'));
  expect(await nativeShare.share(request)).toEqual({ ok: false, code: 'shareFailed' });
});
