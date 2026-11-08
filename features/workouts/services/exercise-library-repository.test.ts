import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { exerciseLibrary, exerciseLibraryVersion, readExerciseLibrary } from '../index';

test('migration seeds exactly the bundled exercises and records the library version', async () => {
  const db = nodeExecutor();
  try {
    expect(await migrateRecord(db, async () => {})).toBeNull();
    const result = await readExerciseLibrary(db);
    expect(result.skippedCount).toBe(0);
    expect(result.rows).toEqual(exerciseLibrary.map((exercise) => ({ ...exercise, libraryVersion: exerciseLibraryVersion })).sort((a, b) => a.id.localeCompare(b.id)));
  } finally { await db.close(); }
});
