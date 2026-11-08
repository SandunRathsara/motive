import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { requireRecord } from '@/lib/persistence';
import { exerciseLibrary, exerciseLibraryVersion, readExerciseLibrary } from '../index';

jest.mock('@/lib/persistence', () => ({ ...jest.requireActual('@/lib/persistence'), requireRecord: jest.fn() }));

test('migration seeds exactly the bundled exercises and records the library version', async () => {
  const db = nodeExecutor();
  try {
    expect(await migrateRecord(db, async () => {})).toBeNull();
    const result = await readExerciseLibrary(db);
    expect(result.skippedCount).toBe(0);
    expect(result.rows).toEqual(exerciseLibrary.map((exercise) => ({ ...exercise, libraryVersion: exerciseLibraryVersion })).sort((a, b) => a.id.localeCompare(b.id)));
  } finally { await db.close(); }
});

test.each(['closed', 'notReady'])('library storage failure (%s) exposes only a typed workouts error', async (failure) => {
  const db = nodeExecutor();
  await db.close();
  jest.mocked(requireRecord).mockImplementation(() => { throw new Error('private record path'); });
  await expect(readExerciseLibrary(failure === 'closed' ? db : undefined))
    .rejects.toMatchObject({ name: 'WorkoutsError', code: 'readFailed', message: 'readFailed' });
});
