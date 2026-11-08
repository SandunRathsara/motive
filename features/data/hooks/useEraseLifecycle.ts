import { useFaultInjectionStore } from '@/store/fault-injection';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { retryBlockedErase, type EraseOutcome } from '../services/erase';

export function useEraseLifecycle() {
  const phase = useRecordLifecycle((state) => state.phase);
  const paused = useFaultInjectionStore((state) => state.paused);
  return {
    phase, paused,
    retry: (): Promise<EraseOutcome> => useRecordLifecycle.getState().phase === 'erase-blocked' ? retryBlockedErase() : Promise.resolve({ ok: false, code: 'busy' }),
  };
}
export type EraseLifecycleViewModel = ReturnType<typeof useEraseLifecycle>;
