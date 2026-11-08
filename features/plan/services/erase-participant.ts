import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { RecordNotReadyError, requireRecord } from '@/lib/persistence';
import { planStore } from './plan-store';

export const planEraseParticipant: EraseParticipant = {
  key: 'plan', owner: 'plan',
  async quiesce() {
    let record;
    try { record = requireRecord(); }
    catch (error) {
      // Recovery and interrupted-erase retries may have no open record to drain.
      if (error instanceof RecordNotReadyError) return;
      throw error;
    }
    // The eraser blocks new writes first. The shared executor queue drains existing writes.
    await record.transaction(async () => {});
  },
  async reset() { planStore.clearChangeListeners(); },
  async isClear() { return !planStore.hasChangeListeners(); },
};
