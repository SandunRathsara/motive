import type { UndoToken } from './services/workout-service';

/** D2: one-tap undo for 5 s after a set log, set delete or session delete. No confirmation dialog. */
export const undoWindowMs = 5_000;

export interface UndoOffer {
  /** "Set logged", "Set deleted", "Session deleted". */
  label: string;
  /** What VoiceOver reads for the Undo button. */
  accessibilityLabel: string;
  deadlineMs: number;
  token: UndoToken;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let current: UndoOffer | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function publish(next: UndoOffer | null) {
  current = next;
  if (timer) clearTimeout(timer);
  timer = null;
  if (next) {
    timer = setTimeout(() => { if (current === next) publish(null); }, Math.max(0, next.deadlineMs - Date.now()));
    // Never keep a test runner or the process alive for a toast.
    (timer as { unref?: () => void }).unref?.();
  }
  for (const listener of listeners) listener();
}

/**
 * A single shared offer (the newest wins), outside React so the toast survives leaving the screen that
 * produced it, for example deleting a session from the active screen and landing on Train. It holds the
 * in-memory inverse of one change, not Query data, and is cleared on erase.
 */
export const undoWindow = {
  offer(token: UndoToken, label: string, now = Date.now()): UndoOffer {
    const next: UndoOffer = { label, accessibilityLabel: `Undo. ${label}`, deadlineMs: now + undoWindowMs, token };
    publish(next);
    return next;
  },
  get: () => current,
  clear: () => publish(null),
  subscribe(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
