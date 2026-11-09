/**
 * The set-logging timer for the Phase 1 speed gate (§10b, D1). Pure: the hook feeds it wall-clock
 * instants. The timer runs to the commit from the later of the chip becoming actionable and the end or
 * Skip of rest. A set logged during rest starts at the first touch after the previous commit.
 * Backgrounded time is excluded.
 */
export interface SetTimer {
  /** When the chip became actionable: the previous commit, or the session/exercise opening. */
  actionableAt: number;
  /** Set by Skip; otherwise the rest ends at its deadline. */
  restEndedAt: number | null;
  firstTouchAt: number | null;
  /** Closed foreground gaps, as [from, to] pairs. */
  backgrounded: readonly (readonly [number, number])[];
  /** Set while the app is in the background. */
  backgroundedAt: number | null;
}

export function armSetTimer(at: number): SetTimer {
  return { actionableAt: at, restEndedAt: null, firstTouchAt: null, backgrounded: [], backgroundedAt: null };
}

export function touchSetTimer(timer: SetTimer, at: number): SetTimer {
  return timer.firstTouchAt === null ? { ...timer, firstTouchAt: at } : timer;
}

export function endRest(timer: SetTimer, at: number): SetTimer {
  return { ...timer, restEndedAt: at };
}

export function backgroundSetTimer(timer: SetTimer, at: number): SetTimer {
  return timer.backgroundedAt === null ? { ...timer, backgroundedAt: at } : timer;
}

export function foregroundSetTimer(timer: SetTimer, at: number): SetTimer {
  if (timer.backgroundedAt === null) return timer;
  return { ...timer, backgrounded: [...timer.backgrounded, [timer.backgroundedAt, at]], backgroundedAt: null };
}

/**
 * @param restDeadline Wall-clock end of the rest that followed the previous commit, or null when there was none.
 * @returns the duration to record, in ms.
 */
export function setLoggingDurationMs(timer: SetTimer, commitAt: number, restDeadline: number | null): number {
  const restActive = restDeadline !== null && timer.restEndedAt === null && commitAt < restDeadline;
  const start = restActive
    ? timer.firstTouchAt ?? commitAt
    : Math.max(timer.actionableAt, timer.restEndedAt ?? restDeadline ?? timer.actionableAt);
  const gaps = [...timer.backgrounded, ...(timer.backgroundedAt === null ? [] : [[timer.backgroundedAt, commitAt] as const])];
  const excluded = gaps.reduce((sum, [from, to]) => sum + Math.max(0, Math.min(to, commitAt) - Math.max(from, start)), 0);
  return Math.max(0, commitAt - start - excluded);
}
