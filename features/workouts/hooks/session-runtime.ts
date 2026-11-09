import { useActiveWorkout } from '@/store/active-workout';
import type { WorkoutSession } from '../workouts.schemas';
import { armSetTimer } from '../workouts.timing';

/** Makes a session the active one for Today, S3 and the quick-add, expanding its first exercise. */
export function beginActiveSession(session: Pick<WorkoutSession, 'id' | 'prescription'>, at = Date.now()) {
  const store = useActiveWorkout.getState();
  store.begin(session.id, session.prescription.exercises[0]?.id ?? null);
  // The first chip became actionable when the session opened; a resumed session starts timing from the resume.
  if (!useActiveWorkout.getState().setTimer) store.setSetTimer(armSetTimer(at));
}
