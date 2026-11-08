import { requireRecord } from '@/lib/persistence';
import { createHealthSync, type HealthSync } from './health-sync';
import { createNativeHealthKitAdapter } from './healthkit-native';
import { getActiveHealthSync, setActiveHealthSync } from './erase-participant';
import { createHealthRepository } from './health-repository';
import { getTrendWeight, healthReadFailure } from './health-read';
import { healthDayKey } from '../health.utils';

/** The erase participant owns the registration; no second reference survives a reset. */
export function getHealthSync(): HealthSync {
  const registered = getActiveHealthSync();
  if (registered) return registered;
  const sync = createHealthSync({ adapter: createNativeHealthKitAdapter() });
  setActiveHealthSync(sync);
  return sync;
}

export const refreshOnOpenAttempted = (): Promise<void> => getHealthSync().refreshOnOpenAttempted();

/** Availability probing never requests authorization. */
export async function isHealthAvailableForPrefill(): Promise<boolean> {
  try { return await getHealthSync().isAvailable(); }
  catch { throw healthReadFailure(); }
}

/** Call only after explicit opt-in; onboarding owns the bounded UI wait. */
export async function requestWeightForPrefill() {
  try {
    if (!await isHealthAvailableForPrefill()) return null;
    const result = await createHealthRepository().listAvailability('bodyMass');
    if (result.skippedCount) throw healthReadFailure();
    const availability = result.rows[0];
    if (!availability || availability.state === 'notRequested') await getHealthSync().connect();
    else if (availability.state === 'requested') await getHealthSync().sync('refresh');
    else return null;
    const now = Date.now();
    return await getTrendWeight(healthDayKey(now, { now }), { now });
  } catch { throw healthReadFailure(); }
}

export async function readHealthSnapshot() {
  try {
    const available = await getHealthSync().isAvailable();
    return await requireRecord().transaction(async (tx) => {
      const repository = createHealthRepository(tx);
      const samples = await repository.listSamples();
      const availability = await repository.listAvailability();
      return { samples: samples.rows, availability: availability.rows, available };
    });
  } catch { throw healthReadFailure(); }
}
