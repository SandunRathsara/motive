import type { ExportSection } from '@/lib/contracts/export-section';
import { readExerciseLibrary } from './exercise-library-repository';

export const exerciseLibraryExportSection: ExportSection = {
  key: 'exerciseLibrary', version: 1, owner: 'workouts', tables: ['exercise_library'],
  read: async (tx) => {
    const result = await readExerciseLibrary(tx);
    return { records: result.rows, skippedCount: result.skippedCount };
  },
};
