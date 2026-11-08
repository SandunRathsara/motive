import { z } from 'zod';

export const exerciseLibraryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  muscleGroup: z.enum(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core']),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'none']),
  bodyweight: z.boolean(),
}).strict();

export type ExerciseLibraryEntry = z.infer<typeof exerciseLibraryEntrySchema>;

export const templateExerciseSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  workingSets: z.number().int().positive(),
  repRange: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict()
    .refine((range) => range.max >= range.min, { message: 'Maximum reps must not be below minimum reps', path: ['max'] }),
  // Zero represents rep-only progression for bodyweight exercises (TRN-5).
  incrementKg: z.number().nonnegative(),
  restOverrideSeconds: z.number().int().positive().optional(),
}).strict();

export type TemplateExercise = z.infer<typeof templateExerciseSchema>;

export const sessionTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  exercises: z.array(templateExerciseSchema).min(1).refine(
    (exercises) => new Set(exercises.map((exercise) => exercise.id)).size === exercises.length,
    { message: 'Template Exercise IDs must be unique within a Session Template' },
  ),
}).strict();

export type SessionTemplate = z.infer<typeof sessionTemplateSchema>;

export const trainingProgramSchema = z.object({
  rotation: z.array(sessionTemplateSchema).min(1).refine(
    (templates) => new Set(templates.map((template) => template.id)).size === templates.length,
    { message: 'Session Template IDs must be unique within a Training Program' },
  ),
}).strict();

export type TrainingProgram = z.infer<typeof trainingProgramSchema>;
