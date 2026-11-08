import { isVerification } from '@/lib/build';

/**
 * Slice-owned decision 7: a step-pause toggle compiled only into the verification variant
 * (`isVerification` is inlined at build time, so owner releases drop these branches).
 * A paused operation never resumes; the owner force-quits to exercise crash recovery (§10b).
 */
export type FaultPoint = 'afterStaging' | 'afterDatabaseDeleted';
export interface FaultInjectionState { available: boolean; armed: FaultPoint | null; paused: FaultPoint | null }

let state: FaultInjectionState = { available: isVerification, armed: null, paused: null };
const listeners = new Set<() => void>();
const set = (next: Partial<FaultInjectionState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const faultInjection = {
  getState: (): FaultInjectionState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  arm(point: FaultPoint | null): void {
    if (isVerification) set({ armed: point });
  },
  /** Resolves immediately unless this verification build is armed at `point`; then never resolves. */
  pauseAt(point: FaultPoint): Promise<void> {
    if (!isVerification || state.armed !== point) return Promise.resolve();
    set({ paused: point });
    return new Promise<void>(() => {});
  },
};
