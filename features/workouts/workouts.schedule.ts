import { dayKey, deviceOffset, type OffsetAt } from '@/lib/utils/time';

/**
 * Pure schedule rules (TRN-2). A training week runs Monday–Sunday under the fixed
 * 04:00 device-local day boundary. Weeks are bounded in wall-clock time, so a DST
 * week is 167 or 169 hours long rather than shifting the boundary.
 */
const DAY = 86_400_000;

export type ScheduleSession = {
  id: string;
  templateId: string;
  startedAt: number;
  /** Null while the session is active; active sessions never auto-finish (D4). */
  endedAt: number | null;
  sets: readonly { type: 'working' | 'warmup' }[];
};

export type TrainingWeek = {
  /** Monday, `YYYY-MM-DD`. */
  startDay: string;
  /** Sunday, `YYYY-MM-DD`. */
  endDay: string;
  /** Monday 04:00 local, inclusive. */
  startMs: number;
  /** Next Monday 04:00 local, exclusive. */
  endMs: number;
};

/** Finished with at least one working set; Other Activity never counts (SIG-9). */
export function isSessionCompleted(session: Pick<ScheduleSession, 'endedAt' | 'sets'>): boolean {
  return session.endedAt !== null && session.sets.some((set) => set.type === 'working');
}

function shiftDay(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY).toISOString().slice(0, 10);
}

/** The instant a local day starts (04:00 local); the offset is resolved at that instant. */
function dayStartInstant(day: string, offsetAt: OffsetAt): number {
  const wallTime = Date.parse(`${day}T04:00:00Z`);
  let instant = wallTime;
  for (let i = 0; i < 3; i++) instant = wallTime - offsetAt(instant) * 60_000;
  return instant;
}

function mondayOf(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return shiftDay(day, -((weekday + 6) % 7));
}

export function trainingWeekBounds(instant: number, offsetAt: OffsetAt = deviceOffset): TrainingWeek {
  const startDay = mondayOf(dayKey(instant, offsetAt));
  const nextStartDay = shiftDay(startDay, 7);
  return {
    startDay, endDay: shiftDay(startDay, 6),
    startMs: dayStartInstant(startDay, offsetAt), endMs: dayStartInstant(nextStartDay, offsetAt),
  };
}

/** D4: a session belongs to the day and training week of its start. */
export function sessionAttribution(session: Pick<ScheduleSession, 'startedAt'>, offsetAt: OffsetAt = deviceOffset) {
  const day = dayKey(session.startedAt, offsetAt);
  return { day, weekStartDay: mondayOf(day) };
}

/** Completed-session counts keyed by the week's Monday (`YYYY-MM-DD`); empty weeks are absent. */
export function completedCountsByWeek(sessions: readonly ScheduleSession[], offsetAt: OffsetAt = deviceOffset): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const session of sessions) {
    if (!isSessionCompleted(session)) continue;
    const { weekStartDay } = sessionAttribution(session, offsetAt);
    counts[weekStartDay] = (counts[weekStartDay] ?? 0) + 1;
  }
  return counts;
}

/** Completed sessions in the training week containing `instant`. */
export function completedInWeek(sessions: readonly ScheduleSession[], instant: number, offsetAt: OffsetAt = deviceOffset): number {
  return completedCountsByWeek(sessions, offsetAt)[trainingWeekBounds(instant, offsetAt).startDay] ?? 0;
}

/**
 * The rotation continues from the template actually done (TRN-2). With no completed
 * session, or when the last completed session's template left the rotation (G10),
 * the next template is the first in rotation order.
 */
export function nextTemplate<T extends { id: string }>(rotation: readonly T[], sessions: readonly ScheduleSession[]): T | null {
  if (rotation.length === 0) return null;
  let last: ScheduleSession | undefined;
  for (const session of sessions) {
    if (isSessionCompleted(session) && (!last || session.startedAt > last.startedAt)) last = session;
  }
  const index = last ? rotation.findIndex((template) => template.id === last.templateId) : -1;
  return rotation[index === -1 ? 0 : (index + 1) % rotation.length];
}
