import { z } from 'zod';
import { parseRows, requireRecord, type SqlConnection } from '@/lib/persistence';
import { exerciseLibraryEntrySchema } from '../workouts.schemas';

const libraryRowSchema = z.object({
  id: z.string(), name: z.string(), muscle_group: z.string(), equipment: z.string(),
  bodyweight: z.union([z.literal(0), z.literal(1)]), library_version: z.number().int().positive(),
}).strict().transform((row) => ({
  id: row.id, name: row.name, muscleGroup: row.muscle_group, equipment: row.equipment,
  bodyweight: row.bodyweight === 1, libraryVersion: row.library_version,
})).pipe(exerciseLibraryEntrySchema.extend({ libraryVersion: z.number().int().positive() }));

export class WorkoutsError extends Error {
  constructor(readonly code: 'readFailed') { super(code); this.name = 'WorkoutsError'; }
}

export async function readExerciseLibrary(connection?: SqlConnection) {
  try { return parseRows(libraryRowSchema, await (connection ?? requireRecord()).getAll('SELECT * FROM exercise_library ORDER BY id')); }
  catch { throw new WorkoutsError('readFailed'); }
}
