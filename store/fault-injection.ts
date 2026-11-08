import { create } from 'zustand';
import type { FaultPoint } from '@/features/data';

export interface FaultInjectionState {
  armed: FaultPoint | null;
  paused: FaultPoint | null;
  arm(point: FaultPoint | null): void;
  pause(point: FaultPoint): void;
}

/** Verification build availability is enforced by the feature service, not this client-state store. */
export const useFaultInjectionStore = create<FaultInjectionState>()((set) => ({
  armed: null,
  paused: null,
  arm: (point) => set({ armed: point }),
  pause: (point) => set({ paused: point }),
}));
