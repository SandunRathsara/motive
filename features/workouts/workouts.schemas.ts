import { z } from 'zod';
import { storedJsonSchema } from '@/lib/contracts/stored-json';
import { templateExerciseSchema as templateExercise } from '@/lib/contracts/training-program';

export const exerciseLibraryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  muscleGroup: z.enum(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core']),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'none']),
  bodyweight: z.boolean(),
}).strict();

export type ExerciseLibraryEntry = z.infer<typeof exerciseLibraryEntrySchema>;

export { templateExerciseSchema, sessionTemplateSchema, trainingProgramSchema } from '@/lib/contracts/training-program';
export type { TemplateExercise, SessionTemplate, TrainingProgram } from '@/lib/contracts/training-program';

// ---- Training log persistence (slice 5). Row schemas are the Zod boundary for SQLite reads. ----
const epochMs = z.number().int().nonnegative();
const flag = z.union([z.literal(0), z.literal(1)]).transform((value) => value === 1);

export const setTypeSchema = z.enum(['working', 'warmup']);
export type SetType = z.infer<typeof setTypeSchema>;

/** Frozen at start (PLAN-7, D7): later program edits never reach an active session. */
export const prescriptionSnapshotSchema = z.object({
  templateName: z.string().min(1),
  exercises: z.array(templateExercise),
}).strict();
export type PrescriptionSnapshot = z.infer<typeof prescriptionSnapshotSchema>;

export const workoutSessionSchema = z.object({
  id: z.string().min(1), templateId: z.string().min(1),
  startedAt: epochMs, endedAt: epochMs.nullable(),
  /** Finished with at least one working set (TRN-2); set by the service, stored as given. */
  completed: z.boolean(),
  deload: z.boolean(),
  prescription: prescriptionSnapshotSchema,
}).strict()
  .refine((session) => session.endedAt === null || session.endedAt >= session.startedAt, { message: 'Session cannot end before it starts', path: ['endedAt'] })
  .refine((session) => !session.completed || session.endedAt !== null, { message: 'An active session cannot be completed', path: ['completed'] });
export type WorkoutSession = z.infer<typeof workoutSessionSchema>;

export const workoutSessionRowSchema = z.object({
  id: z.string(), template_id: z.string(), started_at: z.number(), ended_at: z.number().nullable(),
  completed: flag, deload: flag, prescription_json: storedJsonSchema,
}).strict().transform((row) => ({
  id: row.id, templateId: row.template_id, startedAt: row.started_at, endedAt: row.ended_at,
  completed: row.completed, deload: row.deload, prescription: row.prescription_json,
})).pipe(workoutSessionSchema);

export const setEntrySchema = z.object({
  id: z.string().min(1), sessionId: z.string().min(1),
  templateExerciseId: z.string().min(1), exerciseId: z.string().min(1),
  /** 0-based position among this Template Exercise's sets in the session. */
  index: z.number().int().nonnegative(),
  type: setTypeSchema,
  /** Null for bodyweight exercises (reps only). */
  loadKg: z.number().nonnegative().nullable(),
  reps: z.number().int().positive(),
  committedAt: epochMs, editedAt: epochMs.nullable(),
}).strict();
export type SetEntry = z.infer<typeof setEntrySchema>;

export const setEntryRowSchema = z.object({
  id: z.string(), session_id: z.string(), template_exercise_id: z.string(), exercise_id: z.string(),
  set_index: z.number(), type: z.string(), load_kg: z.number().nullable(), reps: z.number(),
  committed_at: z.number(), edited_at: z.number().nullable(),
}).strict().transform((row) => ({
  id: row.id, sessionId: row.session_id, templateExerciseId: row.template_exercise_id, exerciseId: row.exercise_id,
  index: row.set_index, type: row.type, loadKg: row.load_kg, reps: row.reps, committedAt: row.committed_at, editedAt: row.edited_at,
})).pipe(setEntrySchema);

/**
 * Rebuildable from history. The cache stores what progression rules produced; the key meanings in
 * `stallCounters` belong to those rules.
 */
export const progressionCacheEntrySchema = z.object({
  templateExerciseId: z.string().min(1),
  recommendedSets: z.array(z.object({
    index: z.number().int().nonnegative(), loadKg: z.number().nonnegative().nullable(), reps: z.number().int().positive(),
  }).strict()),
  stallCounters: z.record(z.string(), z.number().finite()),
  sourceSessionIds: z.array(z.string().min(1)),
  updatedAt: epochMs,
}).strict();
export type ProgressionCacheEntry = z.infer<typeof progressionCacheEntrySchema>;

export const progressionCacheRowSchema = z.object({
  template_exercise_id: z.string(), recommended_sets_json: storedJsonSchema, stall_json: storedJsonSchema,
  source_session_ids_json: storedJsonSchema, updated_at: z.number(),
}).strict().transform((row) => ({
  templateExerciseId: row.template_exercise_id, recommendedSets: row.recommended_sets_json,
  stallCounters: row.stall_json, sourceSessionIds: row.source_session_ids_json, updatedAt: row.updated_at,
})).pipe(progressionCacheEntrySchema);
