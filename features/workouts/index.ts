import { workoutService } from './services/workout-service';
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

// ---- Slice 5: service, hooks, view models and exposed-to-later-slices functions ----
export { workoutService };
export type { WorkoutService, WorkoutServiceOptions, LogSetInput, EditSetInput, UndoToken, ProgramState } from './services/workout-service';
/** Plain functions for later slices (training review in slice 6, Coaching Context in slice 11); they read the local record only. */
export const {
  closedWeekCounts: getClosedWeekCounts, stallHistory: getStallHistory, programCreatedAt: getProgramCreatedAt,
  lastSevenDays: getLastSevenDays, startDeloadSession, onWeeklyTargetEdited,
} = workoutService;
export { workoutKeys } from './hooks/query-keys';
export { useTodayTraining } from './hooks/useTodayTraining';
export { useTrainingWeek } from './hooks/useTrainingWeek';
export { useActiveSession } from './hooks/useActiveSession';
export type { ActiveSessionActions } from './hooks/useActiveSession';
export { useSessionSummary } from './hooks/useSessionSummary';
export { useExerciseHistory } from './hooks/useExerciseHistory';
export { useProgramEditor } from './hooks/useProgramEditor';
export type { ProgramEditorViewModel, SaveProgramResult } from './hooks/useProgramEditor';
export { useTrainingSettings } from './hooks/useTrainingSettings';
export type { TrainingSettingsViewModel } from './hooks/useTrainingSettings';
export { useUndo } from './hooks/useUndo';
export type { UndoOffer } from './workouts.undo';
export { defaultRestSeconds } from './workouts.history';
export { validateProgramDraft, programDraftTools } from './workouts.program';
export type { ProgramDraft, ProgramDraftValidation, ProgramDraftTools } from './workouts.program';
export { formatKg, formatSet, formatNumber } from './workouts.format';
export { workoutErrorText } from './workouts.view-models';
export type { Loadable } from './workouts.view-models';
export type {
  ChipSaveState, SetChipViewModel, ExerciseCardViewModel, ActiveSessionContent, ActiveSessionViewModel, SetSheetViewModel, ChipDraft,
} from './workouts.session-view';
export type { TodayTrainingContent, TodayTrainingViewModel } from './workouts.today-view';
export type {
  TemplateCardViewModel, RecentSessionViewModel, OtherActivityViewModel, TrainingWeekContent, TrainingWeekViewModel,
} from './workouts.train-view';
export type { SessionSummaryContent, SessionSummaryViewModel } from './workouts.summary-view';
export type { ExerciseHistoryContent, ExerciseHistoryViewModel } from './workouts.history-view';
