import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { RecordNotReadyError, requireRecord } from '@/lib/persistence';
import { useActiveWorkout } from '@/store/active-workout';
import { undoWindow } from '../workouts.undo';

/**
 * Training-log rows live in the record database, which the eraser deletes as a whole. Repository writes
 * already refuse to run once the record lifecycle blocks them; this participant drains any in-flight
 * commit before removal. In-memory training state is the active-workout store and the pending undo offer, which reset clears.
 */
export const workoutsEraseParticipant: EraseParticipant = {
  key: 'workouts', owner: 'workouts',
  async quiesce() {
    let record;
    try { record = requireRecord(); }
    catch (error) {
      // Recovery and interrupted-erase retries may have no open record to drain.
      if (error instanceof RecordNotReadyError) return;
      throw error;
    }
    // The shared executor queue drains writes that were queued before this empty transaction.
    await record.transaction(async () => {});
  },
  async reset() { useActiveWorkout.getState().reset(); undoWindow.clear(); },
  async isClear() {
    const { activeSessionId, restDeadline, expandedExerciseId, setTimer } = useActiveWorkout.getState();
    return undoWindow.get() === null && activeSessionId === null && restDeadline === null && expandedExerciseId === null && setTimer === null;
  },
};
