const original = process.env.EXPO_PUBLIC_APP_VARIANT;
afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_APP_VARIANT;
  else process.env.EXPO_PUBLIC_APP_VARIANT = original;
  jest.resetModules();
});
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '1' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }));

const load = (variant: 'owner' | 'verification') => {
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  return jest.requireActual<typeof import('./fault-injection')>('./fault-injection').faultInjection;
};
const settled = async (promise: Promise<void>) => {
  let done = false;
  void promise.then(() => { done = true; });
  await new Promise((resolve) => setImmediate(resolve));
  return done;
};

test('owner builds never arm or pause', async () => {
  const faults = load('owner');
  faults.arm('afterStaging');
  expect(faults.getState()).toEqual({ available: false, armed: null, paused: null });
  expect(await settled(faults.pauseAt('afterStaging'))).toBe(true);
});

test('verification builds halt only at the armed step and report it', async () => {
  const faults = load('verification');
  const listener = jest.fn();
  faults.subscribe(listener);
  faults.arm('afterDatabaseDeleted');
  expect(await settled(faults.pauseAt('afterStaging'))).toBe(true);
  expect(await settled(faults.pauseAt('afterDatabaseDeleted'))).toBe(false);
  expect(faults.getState()).toEqual({ available: true, armed: 'afterDatabaseDeleted', paused: 'afterDatabaseDeleted' });
  expect(listener).toHaveBeenCalledTimes(2);
});
