import { workoutService } from './workout-service';

/**
 * Plain functions for later slices (the training review in slice 6, the Coaching Context in slice 11).
 * They read the local record only and never touch Health data.
 */

/** Completed sessions per closed training week, from the Training Program's first week; zeros included. */
export const getClosedWeekCounts = (at?: number) => workoutService.closedWeekCounts(at);
/** Dated Stall events and non-Deload session counts per Template Exercise of the current program. */
export const getStallHistory = () => workoutService.stallHistory();
/** When the Training Program came into existence (Plan v1). */
export const getProgramCreatedAt = () => workoutService.programCreatedAt();
/** Sets and session aggregates for sessions started in the 7 days up to `at`. */
export const getLastSevenDays = (at?: number) => workoutService.lastSevenDays(at);
/** Starts a Deload session: same recommended loads, working sets halved per exercise (rounded up); excluded from progression. */
export const startDeloadSession = (templateId: string) => workoutService.startSession(templateId, { deload: true });
/** Fires when the user edits the weekly target (PLAN-3 supersession). */
export const onWeeklyTargetEdited = workoutService.onWeeklyTargetEdited;
