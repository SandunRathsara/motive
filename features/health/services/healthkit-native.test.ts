import { requireNativeModule } from 'expo';

import { createNativeHealthKitAdapter } from './healthkit-native';

jest.mock('expo', () => ({ requireNativeModule: jest.fn() }));

const loadModule = jest.mocked(requireNativeModule);
const input = { anchor: null, startMs: 123, limit: 100 };
const page = { samples: [{ intentionally: 'invalid sample' }], deletedUuids: ['A7453A19-09DB-4F31-8D82-542B13D8BE80'], anchor: 'opaque', hasMore: false };

beforeEach(() => { loadModule.mockReset(); });

test('validates only the page envelope, preserving invalid samples for sync to count', async () => {
  loadModule.mockReturnValue({ anchoredFetch: async () => page });
  await expect(createNativeHealthKitAdapter().anchoredFetch('bodyMass', input)).resolves.toEqual(page);
});

test.each([
  { ...page, samples: null },
  { ...page, deletedUuids: [42] },
  { ...page, deletedUuids: ['not-a-uuid'] },
  { ...page, anchor: '' },
  { ...page, hasMore: 'false' },
  { ...page, unexpected: true },
])('rejects a malformed page envelope: %j', async (invalid) => {
  loadModule.mockReturnValue({ anchoredFetch: async () => invalid });
  await expect(createNativeHealthKitAdapter().anchoredFetch('sleep', input)).rejects.toThrow();
});

test('validates the status enum without claiming read permission', async () => {
  const requestStatus = jest.fn().mockResolvedValue('unnecessary');
  loadModule.mockReturnValue({ requestStatus });
  const adapter = createNativeHealthKitAdapter();
  await expect(adapter.requestStatus('hrv')).resolves.toBe('unnecessary');
  requestStatus.mockResolvedValue('authorized');
  await expect(adapter.requestStatus('hrv')).rejects.toThrow();
});

test('missing native module is unavailable, while other operations reject', async () => {
  loadModule.mockImplementation(() => { throw new Error('Missing native module'); });
  const adapter = createNativeHealthKitAdapter();
  await expect(adapter.isAvailable()).resolves.toBe(false);
  await expect(adapter.requestReadAuthorization()).rejects.toThrow('E_HEALTHKIT_UNAVAILABLE');
});

test('native failures are not disguised as unavailability', async () => {
  loadModule.mockReturnValue({ isAvailable: async () => { throw new Error('native failed'); } });
  await expect(createNativeHealthKitAdapter().isAvailable()).rejects.toThrow('native failed');
});
