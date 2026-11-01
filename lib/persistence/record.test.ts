import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SqlExecutor, SqlParams } from './executor';
import { createLaunchSentinel, eraseRecord, openRecord, rawDatabaseUri, RecordNotReadyError, requireRecord, restoreSnapshot, type RecordAdapters, type RecordStorage } from './record';
import { nodeExecutor } from './testing/node-executor';

const root = 'file:///test/Application%20Support/Motive';
function fileStorage() {
  const files = new Set<string>([root, `${root}/record.sqlite`, `${root}/record.snapshot.sqlite`]);
  const text = new Map<string, string>();
  const storage: RecordStorage = {
    root,
    readText: async (path) => { const value = text.get(path); if (value === undefined) throw new Error('missing'); return value; },
    writeText: async (path, value) => { files.add(path); text.set(path, value); },
    prepare: jest.fn(async () => { files.add(root); }),
    exists: jest.fn(async (path) => files.has(path)),
    remove: jest.fn(async (path) => { for (const file of files) if (file === path || file.startsWith(`${path}/`)) files.delete(file); }),
    copy: jest.fn(async (from, to) => { if (!files.has(from)) throw new Error('missing'); files.add(to); }),
  };
  return { storage, files };
}
function mockDatabase(version = 1) {
  let secureDelete = false;
  let foreignKeys = false;
  let wal = false;
  const db: SqlExecutor = {
    exec: jest.fn(async (sql: string) => {
      if (sql.includes('secure_delete')) secureDelete = true;
      if (sql.includes('foreign_keys')) foreignKeys = true;
      if (sql.includes('journal_mode')) wal = true;
    }),
    run: jest.fn(async () => {}),
    getFirst: async <T>() => ({ user_version: version }) as T,
    getAll: async <T>() => [{ integrity_check: 'ok' }] as T[],
    transaction: jest.fn(async (work) => work(db)),
    close: jest.fn(async () => {}),
  };
  return { db, pragmas: () => ({ secureDelete, foreignKeys, wal }) };
}
function setup(version = 1) {
  const { storage, files } = fileStorage();
  const database = mockDatabase(version);
  const adapters: RecordAdapters = { storage, openDatabase: jest.fn(async () => database.db) };
  return { ...database, adapters, storage, files };
}
beforeEach(() => { jest.spyOn(console, 'info').mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); });

test('each successful connection and retry has secure delete, foreign keys and WAL enabled', async () => {
  const { adapters } = setup();
  const opened: ReturnType<typeof mockDatabase>[] = [];
  adapters.openDatabase = async () => {
    const connection = mockDatabase(); opened.push(connection); return connection.db;
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await openRecord(adapters);
    expect(result.status).toBe('ready');
    expect(result.snapshotExists).toBe(true);
    expect(opened[attempt].pragmas()).toEqual({ secureDelete: true, foreignKeys: true, wal: true });
    if (result.status === 'ready') await result.handle.close();
  }
  expect(adapters.storage.prepare).toHaveBeenCalledTimes(2);
});

test('database open failure is typed and still reports an available snapshot', async () => {
  const { adapters } = setup();
  adapters.openDatabase = async () => { throw new Error('path and SQL must never escape'); };
  expect(await openRecord(adapters)).toEqual({ status: 'failed', failure: { code: 'openFailed' }, snapshotExists: true });
});

test('storage setup failure is typed; retry can recover', async () => {
  const { adapters, storage } = setup();
  jest.mocked(storage.prepare).mockRejectedValueOnce(new Error('disk full'));
  expect(await openRecord(adapters)).toMatchObject({ status: 'failed', failure: { code: 'openFailed' } });
  const result = await openRecord(adapters);
  expect(result.status).toBe('ready');
  if (result.status === 'ready') await result.handle.close();
});

test('failed cold-open quick check is typed; record is never removed', async () => {
  const { adapters, storage, db } = setup();
  adapters.integrity = async () => false;
  expect(await openRecord(adapters)).toEqual({ status: 'failed', failure: { code: 'integrityFailed' }, snapshotExists: true });
  expect(storage.remove).not.toHaveBeenCalled();
  expect(db.close).toHaveBeenCalledTimes(1);
});

test('failed pre-migration full check is typed without a snapshot write', async () => {
  const { adapters, storage, db } = setup(0);
  adapters.integrity = async () => true;
  db.getAll = async <T>() => [{ integrity_check: 'corrupt' }] as T[];
  expect(await openRecord(adapters)).toMatchObject({ status: 'failed', failure: { code: 'integrityFailed' } });
  expect(storage.remove).not.toHaveBeenCalled();
});

test('failed migration reports versions and closes the connection', async () => {
  const { adapters, db } = setup(0);
  db.transaction = async () => { throw new Error('migration SQL'); };
  expect(await openRecord(adapters)).toMatchObject({ status: 'failed', failure: { code: 'migrationFailed', from: 0, to: 1 } });
  expect(db.close).toHaveBeenCalledTimes(1);
});

test('newer schema executes no mutating SQL and deletes no files', async () => {
  const { adapters, db, storage, pragmas } = setup(42);
  expect(await openRecord(adapters)).toEqual({ status: 'failed', failure: { code: 'newerSchema', found: 42, supported: 1 }, snapshotExists: true });
  expect(pragmas()).toEqual({ secureDelete: false, foreignKeys: false, wal: false });
  expect(db.exec).not.toHaveBeenCalled();
  expect(db.run).not.toHaveBeenCalled();
  expect(storage.remove).not.toHaveBeenCalled();
});

test('openRecord newer-schema refusal leaves real SQLite file byte-identical', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'motive-open-'));
  const path = join(dir, 'record.sqlite');
  try {
    const db = nodeExecutor(path);
    await db.exec('PRAGMA user_version = 99');
    await db.close();
    const hash = () => createHash('sha256').update(readFileSync(path)).digest('hex');
    const before = hash();
    const { storage } = fileStorage();
    const result = await openRecord({ storage, openDatabase: async () => nodeExecutor(path) });
    expect(result).toMatchObject({ status: 'failed', failure: { code: 'newerSchema' } });
    expect(hash()).toBe(before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('erase closes owned connections and removes the entire tree, then succeeds again', async () => {
  const { adapters, files, db } = setup();
  for (const name of ['record.sqlite-wal', 'record.sqlite-shm', 'photos/draft.jpg', 'export-staging/export.json', 'interrupted.file']) files.add(`${root}/${name}`);
  await openRecord(adapters);
  expect(await eraseRecord(adapters)).toEqual({ ok: true });
  expect(files.size).toBe(0);
  expect(db.close).toHaveBeenCalledTimes(1);
  expect(await eraseRecord(adapters)).toEqual({ ok: true });
});

test('erase reports what remains and retries after an interrupted deletion', async () => {
  const { adapters, storage, files } = setup();
  jest.mocked(storage.remove).mockImplementationOnce(async () => { files.delete(`${root}/record.sqlite`); throw new Error('interrupted'); });
  expect(await eraseRecord(adapters)).toEqual({ ok: false, remaining: [root] });
  expect(await eraseRecord(adapters)).toEqual({ ok: true });
});

test('failed close prevents erasing files still in use and can be retried', async () => {
  const { adapters, db, storage } = setup();
  await openRecord(adapters);
  jest.mocked(db.close).mockRejectedValueOnce(new Error('busy'));
  expect(await eraseRecord(adapters)).toEqual({ ok: false, remaining: ['connections-or-storage'] });
  expect(storage.remove).not.toHaveBeenCalled();
  expect(await eraseRecord(adapters)).toEqual({ ok: true });
});

test('unverifiable erase never reports success', async () => {
  const { adapters, storage } = setup();
  storage.exists = async () => { throw new Error('unreadable'); };
  expect(await eraseRecord(adapters)).toEqual({ ok: false, remaining: [root] });
});

test('restore removes db sidecars, preserves snapshot, closes handle and supports reopening', async () => {
  const { adapters, files, db } = setup();
  files.add(`${root}/record.sqlite-wal`); files.add(`${root}/record.sqlite-shm`);
  await openRecord(adapters);
  expect(await restoreSnapshot(adapters)).toEqual({ ok: true });
  expect(db.close).toHaveBeenCalledTimes(1);
  expect(files.has(`${root}/record.sqlite-wal`)).toBe(false);
  expect(files.has(`${root}/record.sqlite-shm`)).toBe(false);
  expect(files.has(`${root}/record.snapshot.sqlite`)).toBe(true);
  const result = await openRecord(adapters);
  expect(result.status).toBe('ready');
  if (result.status === 'ready') await result.handle.close();
});

test('restore interruption keeps the snapshot and can retry', async () => {
  const { adapters, storage } = setup();
  jest.mocked(storage.copy).mockRejectedValueOnce(new Error('disk full'));
  expect(await restoreSnapshot(adapters)).toEqual({ ok: false, code: 'restoreFailed' });
  expect(await restoreSnapshot(adapters)).toEqual({ ok: true });
});

test('restore with no snapshot leaves the database intact', async () => {
  const { adapters, files } = setup();
  files.delete(`${root}/record.snapshot.sqlite`);
  expect(await restoreSnapshot(adapters)).toEqual({ ok: false, code: 'snapshotMissing' });
  expect(files.has(`${root}/record.sqlite`)).toBe(true);
});

test('snapshot VACUUM binds a decoded filesystem path, not a URI', async () => {
  const { adapters, db } = setup(0);
  const paths: SqlParams[] = [];
  db.run = async (_sql, params = []) => { paths.push(params); };
  const result = await openRecord(adapters);
  expect(paths).toEqual([['/test/Application Support/Motive/record.snapshot.sqlite']]);
  if (result.status === 'ready') await result.handle.close();
});

test('ready accessor is unavailable after close, failed open, restore and erase', async () => {
  const { adapters } = setup();
  const result = await openRecord(adapters);
  if (result.status !== 'ready') throw new Error('expected ready');
  expect(requireRecord()).toBe(result.handle);
  await result.handle.close();
  expect(requireRecord).toThrow(RecordNotReadyError);
  await openRecord(adapters);
  await restoreSnapshot(adapters);
  expect(requireRecord).toThrow(RecordNotReadyError);
  await openRecord(adapters);
  await eraseRecord(adapters);
  expect(requireRecord).toThrow(RecordNotReadyError);
  adapters.openDatabase = async () => { throw new Error('failed'); };
  await openRecord(adapters);
  expect(requireRecord).toThrow(RecordNotReadyError);
});

test('sentinel lives inside the erased tree and raw URI addresses the database', async () => {
  const { adapters, storage } = setup();
  const sentinel = createLaunchSentinel(storage);
  expect(await sentinel.read()).toBeNull();
  await sentinel.write('owner/1.0.0+1');
  expect(await sentinel.read()).toBe('owner/1.0.0+1');
  await sentinel.write('owner/1.0.0+2');
  expect(await sentinel.read()).toBe('owner/1.0.0+2');
  await sentinel.clear();
  expect(await sentinel.read()).toBeNull();
  await sentinel.write('owner/1.0.0+1');
  await eraseRecord(adapters);
  expect(await sentinel.read()).toBeNull();
  expect(await rawDatabaseUri(adapters)).toBe(`${root}/record.sqlite`);
});
