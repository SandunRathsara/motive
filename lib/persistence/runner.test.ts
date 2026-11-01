import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SqlExecutor } from './executor';
import { migrations } from './migrations';
import { checkIntegrity, migrateRecord, schemaVersion } from './runner';
import { nodeExecutor } from './testing/node-executor';

const schema = (db: SqlExecutor) => db.getAll<{ type: string; name: string; sql: string }>(
  "SELECT type, name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
);
const databases: SqlExecutor[] = [];
const dirs: string[] = [];
function database(path?: string) { const db = nodeExecutor(path); databases.push(db); return db; }
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.close()));
  dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

test('fresh install commits the only table, version, index and SQL constraints', async () => {
  const db = database();
  const snapshot = jest.fn(async () => {});
  expect(await migrateRecord(db, snapshot)).toBeNull();
  expect(snapshot).not.toHaveBeenCalled();
  expect(await schemaVersion(db)).toBe(migrations.length);
  expect((await schema(db)).map((row) => row.name)).toEqual(['gate_metric_recorded_at', 'gate_metric']);
  await db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['id', 'unclean_exit', null, '1+1', 1]);
  await expect(db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['bad', 'unclean_exit', 3, '1+1', 1])).rejects.toThrow();
  await expect(db.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['bad', 'other', null, '1+1', 1])).rejects.toThrow();
});

test.each([null, {}, { user_version: -1 }, { user_version: 1.5 }, { user_version: '1' }, { user_version: Number.MAX_SAFE_INTEGER + 1 }])('rejects invalid stored version %j', async (row) => {
  const db = database();
  db.getFirst = async <T>() => row as T;
  await expect(schemaVersion(db)).rejects.toThrow();
});

test.each([[], [{ quick_check: 'corrupt' }], [{ wrong: 'ok' }], [{ quick_check: 'ok', extra: 'ok' }], [{ quick_check: 'ok' }, { quick_check: 'ok' }]].map((rows) => ({ rows })))('rejects invalid integrity rows $rows', async ({ rows }) => {
  const db = database();
  db.getAll = async <T>() => rows as T[];
  expect(await checkIntegrity(db, 'quick_check')).toBe(false);
});

test('failure on step 3 of a 1→4 upgrade rolls back every pending DDL and version', async () => {
  const db = database();
  await migrateRecord(db, async () => {});
  const before = await schema(db);
  const list = [...migrations,
    { version: 2, sql: 'CREATE TABLE second(id)' },
    { version: 3, sql: 'CREATE TABLE third(id)' },
    { version: 4, sql: 'CREATE TABLE partial(id); INSERT INTO missing VALUES (1);' },
  ];
  const snapshot = jest.fn(async () => {
    expect(await schemaVersion(db)).toBe(1);
    expect(await schema(db)).toEqual(before);
  });
  expect(await migrateRecord(db, snapshot, list)).toEqual({ code: 'migrationFailed', from: 1, to: 4 });
  expect(await schemaVersion(db)).toBe(1);
  expect(await schema(db)).toEqual(before);
  expect(await migrateRecord(db, snapshot, list)).toEqual({ code: 'migrationFailed', from: 1, to: 4 });
  expect(snapshot).toHaveBeenCalledTimes(2);
});

test('newer schema refusal leaves an on-disk database byte-identical', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'motive-sql-')); dirs.push(dir);
  const path = join(dir, 'record.sqlite');
  const db = database(path);
  await db.exec('PRAGMA user_version = 99');
  await db.close();
  const hash = () => createHash('sha256').update(readFileSync(path)).digest('hex');
  const before = hash();
  const newer = database(path);
  const snapshot = jest.fn();
  expect(await migrateRecord(newer, snapshot)).toEqual({ code: 'newerSchema', found: 99, supported: 1 });
  await newer.close();
  expect(hash()).toBe(before);
  expect(snapshot).not.toHaveBeenCalled();
});

test('one pre-migration snapshot captures v1; a later upgrade replaces it with v2', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'motive-snapshot-')); dirs.push(dir);
  const path = join(dir, 'snapshot.sqlite');
  const db = database();
  await migrateRecord(db, async () => {});
  const list = [...migrations, { version: 2, sql: 'CREATE TABLE second(id)' }, { version: 3, sql: 'CREATE TABLE third(id)' }];
  let count = 0;
  const snapshot = async () => {
    count++;
    if (existsSync(path)) unlinkSync(path);
    await db.run('VACUUM INTO ?', [path]);
  };
  expect(await migrateRecord(db, snapshot, list.slice(0, 2))).toBeNull();
  let copy = database(path);
  expect(await schemaVersion(copy)).toBe(1);
  await copy.close();
  expect(await migrateRecord(db, snapshot, list)).toBeNull();
  copy = database(path);
  expect(await schemaVersion(copy)).toBe(2);
  expect(count).toBe(2);
  expect(readdirSync(dir)).toEqual(['snapshot.sqlite']);
  await migrateRecord(db, snapshot, list);
  expect(count).toBe(2);
});

test('skipped installs migrate directly from v1 through v3 with a single snapshot', async () => {
  const db = database();
  await migrateRecord(db, async () => {});
  const snapshot = jest.fn(async () => {});
  const list = [...migrations, { version: 2, sql: 'CREATE TABLE second(id)' }, { version: 3, sql: 'CREATE TABLE third(id)' }];
  expect(await migrateRecord(db, snapshot, list)).toBeNull();
  expect(await schemaVersion(db)).toBe(3);
  expect((await schema(db)).map((row) => row.name)).toContain('third');
  expect(snapshot).toHaveBeenCalledTimes(1);
});

const fixtures = join(__dirname, '__fixtures__');
test.each(readdirSync(fixtures).filter((name) => /^schema-v\d+\.sql$/.test(name)))('%s upgrades to exactly the fresh schema', async (file) => {
  const fresh = database();
  await migrateRecord(fresh, async () => {});
  const old = database();
  await old.exec(readFileSync(join(fixtures, file), 'utf8'));
  expect(await migrateRecord(old, async () => {})).toBeNull();
  expect(await schemaVersion(old)).toBe(migrations.length);
  expect(await schema(old)).toEqual(await schema(fresh));
});

test('integrity or snapshot failure does not apply any migrations', async () => {
  const db = database();
  await migrateRecord(db, async () => {});
  const before = await schema(db);
  expect(await migrateRecord(db, async () => { throw new Error('diskFull'); }, [...migrations, { version: 2, sql: 'CREATE TABLE second(id)' }])).toEqual({ code: 'migrationFailed', from: 1, to: 2 });
  expect(await schemaVersion(db)).toBe(1);
  expect(await schema(db)).toEqual(before);
});
