import { logEvent } from '@/lib/logger';
import type { SqlExecutor } from './executor';
import { migrations } from './migrations';
import { checkIntegrity, migrateRecord, schemaVersion, supportedVersion, type RecordFailure } from './runner';

export interface RecordStorage {
  /** Dedicated app-controlled directory, never a shared parent directory. */
  root: string;
  prepare(): Promise<void>;
  /** Must reject, not return false, when removal of root cannot be verified. */
  exists(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
}
export interface RecordAdapters {
  storage: RecordStorage;
  openDatabase(directory: string, name: string): Promise<SqlExecutor>;
  integrity?: typeof checkIntegrity;
}
export type RecordHandle = SqlExecutor;
export type OpenRecordResult =
  | { status: 'ready'; handle: RecordHandle; snapshotExists: boolean }
  | { status: 'failed'; failure: RecordFailure; snapshotExists: boolean };
export type EraseRecordResult = { ok: true } | { ok: false; remaining: string[] };
export type RestoreSnapshotResult = { ok: true } | { ok: false; code: 'snapshotMissing' | 'restoreFailed' };

const name = 'record.sqlite';
const snapshotName = 'record.snapshot.sqlite';
const connections = new Map<SqlExecutor, string>();
let lifecycle: Promise<unknown> = Promise.resolve();
function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = lifecycle.then(work);
  lifecycle = result.catch(() => undefined);
  return result;
}
async function adaptersOrDefault(adapters?: RecordAdapters): Promise<RecordAdapters> {
  return adapters ?? (await import('./device')).deviceAdapters();
}
function tracked(db: SqlExecutor, root: string): SqlExecutor {
  const handle: SqlExecutor = {
    exec: (sql) => db.exec(sql), run: (sql, params) => db.run(sql, params),
    getFirst: (sql, params) => db.getFirst(sql, params), getAll: (sql, params) => db.getAll(sql, params),
    transaction: (work) => db.transaction(work),
    close: async () => { await db.close(); connections.delete(handle); },
  };
  connections.set(handle, root);
  return handle;
}
async function closeConnections(root: string): Promise<void> {
  const results = await Promise.allSettled([...connections].filter(([, directory]) => directory === root).map(([db]) => db.close()));
  if (results.some((result) => result.status === 'rejected')) throw new Error('closeFailed');
}

export function openRecord(adapters?: RecordAdapters): Promise<OpenRecordResult> {
  return exclusive(async () => {
    let db: SqlExecutor | undefined;
    let storage: RecordStorage | undefined;
    let snapshotExists = false;
    const fail = async (failure: RecordFailure): Promise<OpenRecordResult> => {
      if (db) {
        try { await db.close(); } catch { logEvent('record_failure', { errorCode: 'closeFailed' }); }
      }
      if (storage) {
        try { snapshotExists = await storage.exists(`${storage.root}/${snapshotName}`); } catch { /* Unknown means not offered. */ }
      }
      logEvent('record_failure', { errorCode: failure.code });
      return { status: 'failed', failure, snapshotExists };
    };
    try {
      const resolved = await adaptersOrDefault(adapters);
      storage = resolved.storage;
      await closeConnections(storage.root);
      snapshotExists = await storage.exists(`${storage.root}/${snapshotName}`);
      await storage.prepare();
      db = tracked(await resolved.openDatabase(storage.root, name), storage.root);
      // WAL changes the file header: refuse newer schemas before any write-capable PRAGMA.
      const found = await schemaVersion(db);
      const supported = supportedVersion(migrations);
      if (found > supported) return fail({ code: 'newerSchema', found, supported });
      await db.exec('PRAGMA secure_delete = ON; PRAGMA foreign_keys = ON;');
      try {
        if (!await (resolved.integrity ?? checkIntegrity)(db, 'quick_check')) return fail({ code: 'integrityFailed' });
      } catch { return fail({ code: 'integrityFailed' }); }
      await db.exec('PRAGMA journal_mode = WAL;');
      const database = db;
      const files = storage;
      const failure = await migrateRecord(db, async () => {
        const path = `${files.root}/${snapshotName}`;
        await files.remove(path);
        // Bound parameters keep paths out of SQL interpolation and logs.
        await database.run('VACUUM INTO ?', [path.startsWith('file://') ? decodeURIComponent(path.slice(7)) : path]);
      });
      if (failure) return fail(failure);
      snapshotExists = await storage.exists(`${storage.root}/${snapshotName}`);
      return { status: 'ready', handle: db, snapshotExists };
    } catch { return fail({ code: 'openFailed' }); }
  });
}

/** Caller must stop ingestion/reset client state before invoking this core. */
export function eraseRecord(adapters?: RecordAdapters): Promise<EraseRecordResult> {
  return exclusive(async () => {
    let storage: RecordStorage;
    try {
      storage = (await adaptersOrDefault(adapters)).storage;
      await closeConnections(storage.root);
    } catch {
      logEvent('record_failure', { errorCode: 'eraseFailed' });
      return { ok: false, remaining: ['connections-or-storage'] };
    }
    try { await storage.remove(storage.root); } catch { /* Verify even after a partially completed removal. */ }
    try {
      if (!await storage.exists(storage.root)) return { ok: true };
    } catch { /* An unverifiable removal is not success. */ }
    logEvent('record_failure', { errorCode: 'eraseFailed' });
    return { ok: false, remaining: [storage.root] };
  });
}

/** Keeps the snapshot for retry after interruption; reopen through openRecord afterward. */
export function restoreSnapshot(adapters?: RecordAdapters): Promise<RestoreSnapshotResult> {
  return exclusive(async () => {
    try {
      const { storage } = await adaptersOrDefault(adapters);
      await closeConnections(storage.root);
      const snapshot = `${storage.root}/${snapshotName}`;
      if (!await storage.exists(snapshot)) return { ok: false, code: 'snapshotMissing' };
      for (const suffix of ['', '-wal', '-shm']) await storage.remove(`${storage.root}/${name}${suffix}`);
      await storage.copy(snapshot, `${storage.root}/${name}`);
      if (!await storage.exists(`${storage.root}/${name}`)) throw new Error('restoreFailed');
      return { ok: true };
    } catch {
      logEvent('record_failure', { errorCode: 'restoreFailed' });
      return { ok: false, code: 'restoreFailed' };
    }
  });
}
