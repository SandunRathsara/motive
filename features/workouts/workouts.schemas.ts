import { z } from 'zod';

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
