jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '3' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));

const originalVariant = process.env.EXPO_PUBLIC_APP_VARIANT;
beforeEach(() => {
  jest.doMock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '3' }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));
});
afterEach(() => {
  if (originalVariant === undefined) delete process.env.EXPO_PUBLIC_APP_VARIANT;
  else process.env.EXPO_PUBLIC_APP_VARIANT = originalVariant;
  jest.resetModules();
});

test('native identity matches the tag suffix, owner is the default and Worker is unset', () => {
  delete process.env.EXPO_PUBLIC_APP_VARIANT;
  const build = jest.requireActual<typeof import('./build')>('./build');
  expect(build.buildId).toBe('1.0.0+3');
  expect(build.variant).toBe('owner');
  expect(build.isVerification).toBe(false);
  expect(build.workerUrl).toBeUndefined();
  expect(build.buildIdentity).toEqual({ variant: 'owner', version: '1.0.0', buildNumber: '3', buildId: '1.0.0+3', gitTag: 'build/owner/1.0.0+3' });
});

test('git tag follows the BUILD-1 release tag for the variant; dev identities have none', () => {
  process.env.EXPO_PUBLIC_APP_VARIANT = 'verification';
  expect(jest.requireActual<typeof import('./build')>('./build').gitTag).toBe('build/verification/1.0.0+3');
  jest.resetModules();
  jest.doMock('expo-application', () => ({ nativeApplicationVersion: null, nativeBuildVersion: null }));
  expect(jest.requireActual<typeof import('./build')>('./build').gitTag).toBeNull();
});

test('verification flag is selected from the public compile-time variable', () => {
  process.env.EXPO_PUBLIC_APP_VARIANT = 'verification';
  const build = jest.requireActual<typeof import('./build')>('./build');
  expect(build.variant).toBe('verification');
  expect(build.isVerification).toBe(true);
});

test('missing native identity has a safe dev fallback', () => {
  jest.doMock('expo-application', () => ({ nativeApplicationVersion: null, nativeBuildVersion: null }));
  const build = jest.requireActual<typeof import('./build')>('./build');
  expect(build.buildId).toBe('0.0.0+dev');
});

test.each([42, '', {}])('invalid native identity %p is rejected at the boundary', (value) => {
  jest.doMock('expo-application', () => ({ nativeApplicationVersion: value, nativeBuildVersion: '3' }));
  expect(() => jest.requireActual('./build')).toThrow();
});

test('unknown public variant is rejected', () => {
  process.env.EXPO_PUBLIC_APP_VARIANT = 'production';
  expect(() => jest.requireActual('./build')).toThrow();
});

test('validated config supplies dev identity and Worker slot', () => {
  jest.doMock('expo-application', () => ({ nativeApplicationVersion: null, nativeBuildVersion: null }));
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {
    version: '2.0.0', ios: { buildNumber: '4' }, extra: { workerUrl: 'https://worker.example' },
  } } }));
  const build = jest.requireActual<typeof import('./build')>('./build');
  expect(build.buildId).toBe('2.0.0+4');
  expect(build.workerUrl).toBe('https://worker.example');
});

test('invalid Expo config identity is rejected', () => {
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: 42 } } }));
  expect(() => jest.requireActual('./build')).toThrow();
});
