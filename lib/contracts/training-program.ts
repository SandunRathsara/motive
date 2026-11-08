import { z } from 'zod';

/** Shared persisted shape. Content/library ownership stays with workouts. */
export const templateExerciseSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  workingSets: z.number().int().positive(),
  repRange: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict()
    .refine((range) => range.max >= range.min, { message: 'Maximum reps must not be below minimum reps', path: ['max'] }),
  incrementKg: z.number().nonnegative(),
  restOverrideSeconds: z.number().int().positive().optional(),
}).strict();
export type TemplateExercise = z.infer<typeof templateExerciseSchema>;

export const sessionTemplateSchema = z.object({
  id: z.string().min(1), name: z.string().min(1),
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
