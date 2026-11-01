jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '3' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));

const originalVariant = process.env.EXPO_PUBLIC_APP_VARIANT;
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
