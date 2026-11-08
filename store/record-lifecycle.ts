import { create } from 'zustand';

/**
 * Record phase after the record has opened (opening/recovery stay in the record gate).
 * The root layout gates mounting on it; erase participants refuse work unless writes are allowed.
 * Holds no Query data.
 */
export type RecordPhase = 'ready' | 'exporting' | 'erasing' | 'erase-blocked';

export interface RecordLifecycleState {
  phase: RecordPhase;
  /** Increments after each verified erase; the record gate reopens a fresh record on change. */
  eraseGeneration: number;
  /** Returns false (and changes nothing) unless the record is ready. */
  beginExport(): boolean;
  endExport(): void;
  /** Allowed from ready or erase-blocked; returns false while exporting or already erasing. */
  beginErase(): boolean;
  blockErase(): void;
  /** Verified success; launch resume already owns its open and passes false to avoid another. */
  completeErase(reopen?: boolean): void;
}

export const useRecordLifecycle = create<RecordLifecycleState>()((set, get) => ({
  phase: 'ready',
  eraseGeneration: 0,
  beginExport: () => {
    if (get().phase !== 'ready') return false;
    set({ phase: 'exporting' });
    return true;
  },
  endExport: () => { if (get().phase === 'exporting') set({ phase: 'ready' }); },
  beginErase: () => {
    const { phase } = get();
    if (phase !== 'ready' && phase !== 'erase-blocked') return false;
    set({ phase: 'erasing' });
    return true;
  },
  blockErase: () => set({ phase: 'erase-blocked' }),
  completeErase: (reopen = true) => set((state) => ({ phase: 'ready', eraseGeneration: state.eraseGeneration + (reopen ? 1 : 0) })),
}));

/** Writes are refused while erasing or after an unfinished erase. */
export function recordWritesAllowed(phase: RecordPhase = useRecordLifecycle.getState().phase): boolean {
  return phase === 'ready' || phase === 'exporting';
}
