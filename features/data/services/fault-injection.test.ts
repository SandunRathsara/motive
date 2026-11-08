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
  const faults = jest.requireActual<typeof import('./fault-injection')>('./fault-injection').faultInjection;
  const store = jest.requireActual<typeof import('@/store/fault-injection')>('@/store/fault-injection').useFaultInjectionStore;
  return { faults, store };
};
const settled = async (promise: Promise<void>) => {
  let done = false;
  void promise.then(() => { done = true; });
  await new Promise((resolve) => setImmediate(resolve));
  return done;
};

test('owner builds never arm or pause', async () => {
  const { faults, store } = load('owner');
  faults.arm('afterStaging');
  expect(faults.available).toBe(false);
  expect(store.getState()).toMatchObject({ armed: null, paused: null });
  // Even stale or directly manipulated client state cannot bypass the build gate.
  store.getState().arm('afterStaging');
  expect(await settled(faults.pauseAt('afterStaging'))).toBe(true);
  expect(store.getState().paused).toBeNull();
});

test('verification builds halt only at the armed step and report it', async () => {
  const { faults, store } = load('verification');
  expect(faults.available).toBe(true);
  expect(await settled(faults.pauseAt('afterStaging'))).toBe(true);
  faults.arm('afterDatabaseDeleted');
  expect(await settled(faults.pauseAt('afterStaging'))).toBe(true);
  expect(await settled(faults.pauseAt('afterDatabaseDeleted'))).toBe(false);
  expect(store.getState()).toMatchObject({ armed: 'afterDatabaseDeleted', paused: 'afterDatabaseDeleted' });
});
