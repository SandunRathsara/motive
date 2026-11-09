import { migrations } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { toIsoWithOffset } from '@/lib/utils/time';
import { createWorkoutRepository } from './workout-repository';
import { trainingLogExportSection } from './training-log-export-section';

const exercise = { id: 'te1', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 8, max: 10 }, incrementKg: 2.5, restOverrideSeconds: 120 };

test('exports sessions, sets and the progression cache in canonical form, counting invalid rows', async () => {
  const db = nodeExecutor();
  try {
    await db.exec('PRAGMA foreign_keys = ON');
    await migrateRecord(db, async () => {}, migrations);
    const repo = createWorkoutRepository(db);
    await repo.insertSession({ id: 's1', templateId: 't1', startedAt: 1_700_000_000_000, endedAt: 1_700_000_900_000, completed: true, deload: false, prescription: { templateName: 'Push', exercises: [exercise] } });
    await repo.insertSet({ id: 'a', sessionId: 's1', templateExerciseId: 'te1', exerciseId: 'bench-press', index: 0, type: 'working', loadKg: 80, reps: 9, committedAt: 1_700_000_100_000, editedAt: null });
    await repo.insertSet({ id: 'b', sessionId: 's1', templateExerciseId: 'te1', exerciseId: 'bench-press', index: 1, type: 'warmup', loadKg: null, reps: 5, committedAt: 1_700_000_200_000, editedAt: 1_700_000_300_000 });
    await repo.putProgression({ templateExerciseId: 'te1', recommendedSets: [{ index: 0, loadKg: 82.5, reps: 8 }], stallCounters: { sessions: 1 }, sourceSessionIds: ['s1'], updatedAt: 1_700_000_950_000 });
    await db.run("INSERT INTO progression_cache VALUES ('broken', 'nope', '{}', '[]', 1)");

    const result = await trainingLogExportSection.read(db);
    expect(result.skippedCount).toBe(1);
    expect(result.records).toEqual([
      { kind: 'session', id: 's1', templateId: 't1', startedAt: toIsoWithOffset(1_700_000_000_000), endedAt: toIsoWithOffset(1_700_000_900_000), completed: true, deload: false, prescription: { templateName: 'Push', exercises: [exercise] } },
      { kind: 'set', id: 'a', sessionId: 's1', templateExerciseId: 'te1', exerciseId: 'bench-press', index: 0, type: 'working', loadKg: 80, reps: 9, committedAt: toIsoWithOffset(1_700_000_100_000), editedAt: null },
      { kind: 'set', id: 'b', sessionId: 's1', templateExerciseId: 'te1', exerciseId: 'bench-press', index: 1, type: 'warmup', loadKg: null, reps: 5, committedAt: toIsoWithOffset(1_700_000_200_000), editedAt: toIsoWithOffset(1_700_000_300_000) },
      { kind: 'progression', templateExerciseId: 'te1', recommendedSets: [{ index: 0, loadKg: 82.5, reps: 8 }], stallCounters: { sessions: 1 }, sourceSessionIds: ['s1'], updatedAt: toIsoWithOffset(1_700_000_950_000) },
    ]);
    expect(trainingLogExportSection).toMatchObject({ key: 'trainingLog', owner: 'workouts', tables: ['workout_session', 'set_entry', 'progression_cache'] });
  } finally { await db.close(); }
});

test('an active session exports with a null end', async () => {
  const db = nodeExecutor();
  try {
    await migrateRecord(db, async () => {}, migrations);
    await createWorkoutRepository(db).insertSession({ id: 's1', templateId: 't1', startedAt: 1_700_000_000_000, endedAt: null, completed: false, deload: false, prescription: { templateName: 'Push', exercises: [] } });
    expect((await trainingLogExportSection.read(db)).records).toMatchObject([{ kind: 'session', endedAt: null, completed: false }]);
  } finally { await db.close(); }
});
