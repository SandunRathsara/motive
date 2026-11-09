export { exerciseLibraryEntrySchema, templateExerciseSchema, sessionTemplateSchema, trainingProgramSchema } from './workouts.schemas';
export type { ExerciseLibraryEntry, TemplateExercise, SessionTemplate, TrainingProgram } from './workouts.schemas';
export {
  setTypeSchema, prescriptionSnapshotSchema, workoutSessionSchema, workoutSessionRowSchema, setEntrySchema, setEntryRowSchema,
  progressionCacheEntrySchema, progressionCacheRowSchema,
} from './workouts.schemas';
export type { SetType, PrescriptionSnapshot, WorkoutSession, SetEntry, ProgressionCacheEntry } from './workouts.schemas';
export { exerciseLibrary, exerciseLibraryVersion, getExerciseById, starterSessionTemplate, starterTrainingProgram } from './workouts.content';
export { readExerciseLibrary } from './services/exercise-library-repository';
export { WorkoutsError } from './workouts.errors';
export type { WorkoutsErrorCode } from './workouts.errors';
export { exerciseLibraryExportSection } from './services/export-section';
export { createWorkoutRepository, inWorkoutTransaction, assertWorkoutWritesAllowed } from './services/workout-repository';
export type { WorkoutRepository, SessionFilter, SetFilter, SessionPatch, SetPatch } from './services/workout-repository';
export { trainingLogExportSection } from './services/training-log-export-section';
export { workoutsEraseParticipant } from './services/erase-participant';
export { computeProgression } from './workouts.progression';
export type {
  ActualSet, LoadReset, ProgressionOutcome, ProgressionPrescription, ProgressionResult, ProgressionSession, ProgressionSet,
  RecommendedSet, SessionProgressionEvaluation, StallEvent, StallKind, StallState,
} from './workouts.progression';
export { isSessionCompleted, trainingWeekBounds, sessionAttribution, completedCountsByWeek, completedInWeek, nextTemplate } from './workouts.schedule';
export type { ScheduleSession, TrainingWeek } from './workouts.schedule';
export { summarizeSession, previousCompletedSession, compareWithPrevious, nextTimeLine } from './workouts.summary';
export type { SummarySet, SummarySession, ExerciseLookup, SessionSummary, SessionComparison, NextTimeOutcome } from './workouts.summary';
export { linkWorkouts } from './workouts.linking';
export type { LinkableSession, LinkableWorkout, WorkoutLink, WorkoutLinking } from './workouts.linking';
export {
  armSetTimer, touchSetTimer, endRest, backgroundSetTimer, foregroundSetTimer, setLoggingDurationMs,
} from './workouts.timing';
export type { SetTimer } from './workouts.timing';
