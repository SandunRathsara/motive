import { requireRecord } from '@/lib/persistence';
import { createHealthSync, type HealthSync } from './health-sync';
import { createNativeHealthKitAdapter } from './healthkit-native';
import { getActiveHealthSync, setActiveHealthSync } from './erase-participant';
import { createHealthRepository } from './health-repository';
import { healthReadFailure } from './health-read';

/** The erase participant owns the registration; no second reference survives a reset. */
export function getHealthSync(): HealthSync {
  const registered = getActiveHealthSync();
  if (registered) return registered;
  const sync = createHealthSync({ adapter: createNativeHealthKitAdapter() });
  setActiveHealthSync(sync);
  return sync;
}

export const refreshOnOpenAttempted = (): Promise<void> => getHealthSync().refreshOnOpenAttempted();

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
