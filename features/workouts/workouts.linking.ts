import type { HealthWorkout } from '@/features/health';

/**
 * SIG-9 linking, derived on read from cached Health workouts and session windows;
 * nothing is stored. Imports health's public type only (ARCHITECTURE §5).
 */
export type LinkableWorkout = Pick<HealthWorkout, 'id' | 'startMs' | 'endMs'>;
export type LinkableSession = { id: string; startedAt: number; endedAt: number | null };
export type WorkoutLink = { sessionId: string; workoutId: string; overlapMs: number };
export type WorkoutLinking<W extends LinkableWorkout> = {
  links: WorkoutLink[];
  /** Workouts linked to no session, including qualifying but non-largest overlaps (G7). */
  otherActivity: W[];
};

/**
 * Overlap of at least 50% of the shorter window qualifies, whatever the workout type.
 * Assignment is one-to-one and greedy by overlap size descending; ties go to the
 * earlier session start, then to ids so the result never depends on input order.
 * An active session (no end) runs until `now`.
 */
export function linkWorkouts<W extends LinkableWorkout>(
  sessions: readonly LinkableSession[], workouts: readonly W[], now: number,
): WorkoutLinking<W> {
  const candidates: { session: LinkableSession; workout: W; overlapMs: number }[] = [];
  for (const session of sessions) {
    const sessionEnd = Math.max(session.endedAt ?? now, session.startedAt);
    for (const workout of workouts) {
      const overlapMs = Math.min(sessionEnd, workout.endMs) - Math.max(session.startedAt, workout.startMs);
      if (overlapMs < 0) continue;
      const shorter = Math.min(sessionEnd - session.startedAt, workout.endMs - workout.startMs);
      if (overlapMs >= shorter * 0.5 && (overlapMs > 0 || shorter === 0)) candidates.push({ session, workout, overlapMs });
    }
  }
  candidates.sort((a, b) =>
    b.overlapMs - a.overlapMs
    || a.session.startedAt - b.session.startedAt
    || a.session.id.localeCompare(b.session.id)
    || a.workout.startMs - b.workout.startMs
    || a.workout.id.localeCompare(b.workout.id));

  const usedSessions = new Set<string>(), usedWorkouts = new Set<string>();
  const links: WorkoutLink[] = [];
  for (const { session, workout, overlapMs } of candidates) {
    if (usedSessions.has(session.id) || usedWorkouts.has(workout.id)) continue;
    usedSessions.add(session.id);
    usedWorkouts.add(workout.id);
    links.push({ sessionId: session.id, workoutId: workout.id, overlapMs });
  }
  const otherActivity = workouts
    .filter((workout) => !usedWorkouts.has(workout.id))
    .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
  return { links, otherActivity };
}
