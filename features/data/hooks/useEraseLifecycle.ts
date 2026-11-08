import { useSyncExternalStore } from 'react';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { eraseAll, type EraseOutcome } from '../services/erase';
import { faultInjection } from '../services/fault-injection';

export function useEraseLifecycle() {
  const phase = useRecordLifecycle((state) => state.phase);
  const { paused } = useSyncExternalStore(faultInjection.subscribe, faultInjection.getState, faultInjection.getState);
  return {
    phase, paused,
    retry: (): Promise<EraseOutcome> => useRecordLifecycle.getState().phase === 'erase-blocked' ? eraseAll() : Promise.resolve({ ok: false, code: 'busy' }),
  };
}
export type EraseLifecycleViewModel = ReturnType<typeof useEraseLifecycle>;
