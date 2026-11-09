import type { SqlExecutor } from './executor';
import { migrations } from './migrations';
import { migrateRecord } from './runner';
import { nodeExecutor } from './testing/node-executor';

const databases: SqlExecutor[] = [];
async function migrated(upTo = migrations.length) {
  const db = nodeExecutor(); databases.push(db);
  await db.exec('PRAGMA foreign_keys = ON');
  expect(await migrateRecord(db, async () => {}, migrations.slice(0, upTo))).toBeNull();
  return db;
}
afterEach(async () => { await Promise.all(databases.splice(0).map((db) => db.close())); });

const session = ['s1', 't1', 1000, null, 0, 0, '{"templateName":"Push","exercises":[]}'];
const insertSession = (db: SqlExecutor, values: readonly (string | number | null)[] = session) =>
  db.run('INSERT INTO workout_session (id, template_id, started_at, ended_at, completed, deload, prescription_json) VALUES (?, ?, ?, ?, ?, ?, ?)', values);
const insertSet = (db: SqlExecutor, values: readonly (string | number | null)[]) =>
  db.run('INSERT INTO set_entry (id, session_id, template_exercise_id, exercise_id, set_index, type, load_kg, reps, committed_at, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', values);

test('workout_session rejects impossible lifecycle states and a second active session', async () => {
  const db = await migrated();
  await insertSession(db);
  await expect(insertSession(db, ['s2', 't1', 2000, null, 0, 0, '{}'])).rejects.toThrow();
  await expect(insertSession(db, ['s3', 't1', 2000, 1999, 1, 0, '{}'])).rejects.toThrow();
  await expect(insertSession(db, ['s4', 't1', 2000, null, 1, 0, '{}'])).rejects.toThrow();
  await expect(insertSession(db, ['s5', 't1', 2000, 2500, 2, 0, '{}'])).rejects.toThrow();
  await db.run('UPDATE workout_session SET ended_at = 1500 WHERE id = ?', ['s1']);
  await insertSession(db, ['s6', 't1', 2000, null, 0, 1, '{}']);
});

test('set_entry enforces type, load and reps domains and cascades with its session', async () => {
  const db = await migrated();
  await insertSession(db);
  await insertSet(db, ['a', 's1', 'te1', 'bench-press', 0, 'working', 80, 9, 1100, null]);
  await insertSet(db, ['b', 's1', 'te2', 'push-up', 0, 'working', null, 12, 1200, 1300]);
  await expect(insertSet(db, ['c', 's1', 'te1', 'bench-press', 1, 'drop', 80, 9, 1100, null])).rejects.toThrow();
  await expect(insertSet(db, ['d', 's1', 'te1', 'bench-press', 1, 'working', -1, 9, 1100, null])).rejects.toThrow();
  await expect(insertSet(db, ['e', 's1', 'te1', 'bench-press', 1, 'working', 80, 0, 1100, null])).rejects.toThrow();
  await expect(insertSet(db, ['f', 's1', 'te1', 'bench-press', -1, 'working', 80, 9, 1100, null])).rejects.toThrow();
  await expect(insertSet(db, ['g', 'missing', 'te1', 'bench-press', 0, 'working', 80, 9, 1100, null])).rejects.toThrow();
  await db.run('DELETE FROM workout_session WHERE id = ?', ['s1']);
  expect(await db.getAll('SELECT id FROM set_entry')).toEqual([]);
});

test('progression_cache holds one row per Template Exercise', async () => {
  const db = await migrated();
  const insert = (id: string) => db.run('INSERT INTO progression_cache (template_exercise_id, recommended_sets_json, stall_json, source_session_ids_json, updated_at) VALUES (?, ?, ?, ?, ?)', [id, '[]', '{}', '[]', 1]);
  await insert('te1');
  await expect(insert('te1')).rejects.toThrow();
});

test('gate_metric keeps its rows and accepts the distinct edit-after-save event type', async () => {
  const before = await migrated(3);
  await before.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['m1', 'set_logging', 900, '1+1', 5]);
  await before.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['m2', 'unclean_exit', null, '1+1', 6]);
  expect(await migrateRecord(before, async () => {}, migrations)).toBeNull();
  expect(await before.getAll('SELECT * FROM gate_metric ORDER BY recorded_at')).toEqual([
    { id: 'm1', event_type: 'set_logging', duration_ms: 900, build: '1+1', recorded_at: 5 },
    { id: 'm2', event_type: 'unclean_exit', duration_ms: null, build: '1+1', recorded_at: 6 },
  ]);
  await before.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['m3', 'set_edit', 400, '1+1', 7]);
  await expect(before.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['m4', 'set_other', 400, '1+1', 8])).rejects.toThrow();
  await expect(before.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['m5', 'unclean_exit', 4, '1+1', 9])).rejects.toThrow();
  expect((await before.getAll("SELECT name FROM sqlite_schema WHERE type = 'index' AND name = 'gate_metric_recorded_at'"))).toHaveLength(1);
});
