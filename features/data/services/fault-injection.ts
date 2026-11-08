import { isVerification } from '@/lib/build';
import { useFaultInjectionStore } from '@/store/fault-injection';

/**
 * Slice-owned decision 7: a step-pause toggle compiled only into the verification variant
 * (`isVerification` is inlined at build time, so owner releases drop these branches).
 * A paused operation never resumes; the owner force-quits to exercise crash recovery (§10b).
 */
export type FaultPoint = 'afterStaging' | 'afterDatabaseDeleted';

export const faultInjection = {
  available: isVerification,
  arm(point: FaultPoint | null): void {
    if (isVerification) useFaultInjectionStore.getState().arm(point);
  },
  /** Resolves immediately unless this verification build is armed at `point`; then never resolves. */
  pauseAt(point: FaultPoint): Promise<void> {
    if (!isVerification || useFaultInjectionStore.getState().armed !== point) return Promise.resolve();
    useFaultInjectionStore.getState().pause(point);
    return new Promise<void>(() => {});
  },
};
