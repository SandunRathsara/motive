export { exerciseLibraryEntrySchema, templateExerciseSchema, sessionTemplateSchema, trainingProgramSchema } from './workouts.schemas';
export type { ExerciseLibraryEntry, TemplateExercise, SessionTemplate, TrainingProgram } from './workouts.schemas';
export { exerciseLibrary, exerciseLibraryVersion, getExerciseById, starterSessionTemplate, starterTrainingProgram } from './workouts.content';
export { readExerciseLibrary, WorkoutsError } from './services/exercise-library-repository';
export { exerciseLibraryExportSection } from './services/export-section';
export { computeProgression } from './workouts.progression';
export type {
  ActualSet, LoadReset, ProgressionOutcome, ProgressionPrescription, ProgressionResult, ProgressionSession, ProgressionSet,
  RecommendedSet, SessionProgressionEvaluation, StallEvent, StallKind, StallState,
} from './workouts.progression';
