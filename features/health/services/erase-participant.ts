import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { queryClient } from '@/lib/query/client';
import { healthKeys } from '../hooks/query-keys';
import type { HealthSync } from './health-sync';

let activeHealthSync: HealthSync | undefined;

/** App composition registers its singleton here; data control never imports the native adapter. */
export function setActiveHealthSync(sync: HealthSync): void {
  if (activeHealthSync && activeHealthSync !== sync) throw new Error('healthSyncAlreadyRegistered');
  if (activeHealthSync === sync) return;
  activeHealthSync = sync;
  sync.onCommitted(() => { void queryClient.invalidateQueries({ queryKey: healthKeys.all }); });
}

export const getActiveHealthSync = (): HealthSync | undefined => activeHealthSync;

export const healthEraseParticipant: EraseParticipant = {
  key: 'health', owner: 'health',
  async quiesce() { await activeHealthSync?.stopIngestion(); },
  async reset() {
    await activeHealthSync?.reset();
    if (activeHealthSync && !activeHealthSync.isClear()) throw new Error('healthSyncNotClear');
    activeHealthSync = undefined;
  },
  async isClear() { return activeHealthSync === undefined; },
};
