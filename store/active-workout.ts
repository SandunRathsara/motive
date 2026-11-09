import { create } from 'zustand';
import type { SetTimer } from '@/features/workouts';

/**
 * Client state that Today, the active session and the quick-add share (ARCHITECTURE §5): which session is
 * active, the rest deadline, the expanded exercise and the set-timer anchors. Committed sets, sessions and
 * progression are never copied in (they stay in Query over the local record), and nothing is persisted:
 * after a crash the active session is found in the record, not here.
 */
export interface ActiveWorkoutState {
  activeSessionId: string | null;
  /** Wall-clock end of the current rest (epoch ms), so it survives backgrounding. */
  restDeadline: number | null;
  /** Length of the current rest including +30 s, only to scale the rest bar. */
  restSeconds: number | null;
  expandedExerciseId: string | null;
  setTimer: SetTimer | null;
  /** Mark a session active. Switching sessions clears rest and expansion; re-entering the same one keeps them. */
  begin(sessionId: string, firstExerciseId: string | null): void;
  expand(templateExerciseId: string | null): void;
  startRest(deadline: number, seconds: number): void;
  addRest(ms: number): void;
  skipRest(): void;
  setSetTimer(timer: SetTimer | null): void;
  /** The session finished or was deleted. */
  end(): void;
  reset(): void;
}

const idle = {
  activeSessionId: null, restDeadline: null, restSeconds: null, expandedExerciseId: null, setTimer: null,
} satisfies Partial<ActiveWorkoutState>;

export const useActiveWorkout = create<ActiveWorkoutState>()((set) => ({
  ...idle,
  begin: (sessionId, firstExerciseId) => set((state) => (state.activeSessionId === sessionId ? state : {
    ...idle, activeSessionId: sessionId, expandedExerciseId: firstExerciseId,
  })),
  expand: (templateExerciseId) => set({ expandedExerciseId: templateExerciseId }),
  startRest: (deadline, seconds) => set({ restDeadline: deadline, restSeconds: seconds }),
  addRest: (ms) => set((state) => (state.restDeadline === null ? state : {
    restDeadline: state.restDeadline + ms, restSeconds: (state.restSeconds ?? 0) + ms / 1000,
  })),
  skipRest: () => set({ restDeadline: null, restSeconds: null }),
  setSetTimer: (setTimer) => set({ setTimer }),
  end: () => set(idle),
  reset: () => set(idle),
}));
