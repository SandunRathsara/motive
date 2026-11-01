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
  /** Same-volume move; destination must not exist unless overwrite is explicit. */
  move(from: string, to: string, overwrite?: boolean): Promise<void>;
  readText(path: string): Promise<string>;
  writeText(path: string, value: string): Promise<void>;
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
const restoreMarker = 'restore-pending';

async function finishErase(storage: RecordStorage): Promise<void> {
  const trash = `${storage.root}.erasing`;
  if (await storage.exists(trash)) await storage.remove(trash);
  if (await storage.exists(trash)) throw new Error('eraseIncomplete');
}

async function finishRestore(storage: RecordStorage): Promise<void> {
  const marker = `${storage.root}/${restoreMarker}`;
  if (!await storage.exists(marker)) return;
  const snapshot = `${storage.root}/${snapshotName}`;
  const staged = `${storage.root}/record.restore.sqlite`;
  if (!await storage.exists(snapshot)) throw new Error('snapshotMissing');
  // Always recopy: an interrupted copy may have left a partial staged file.
  await storage.remove(staged);
  await storage.copy(snapshot, staged);
  if (!await storage.exists(staged)) throw new Error('restoreFailed');
  for (const suffix of ['', '-wal', '-shm']) {
    const path = `${storage.root}/${name}${suffix}`;
    await storage.remove(path);
    if (await storage.exists(path)) throw new Error('restoreFailed');
  }
  await storage.move(staged, `${storage.root}/${name}`);
  if (!await storage.exists(`${storage.root}/${name}`)) throw new Error('restoreFailed');
  await storage.remove(marker);
  if (await storage.exists(marker)) throw new Error('restoreFailed');
}
const connections = new Map<SqlExecutor, string>();
let readyRecord: RecordHandle | undefined;
export class RecordNotReadyError extends Error {
  readonly code = 'recordNotReady';
  constructor() { super('Record is not ready'); }
}
export function requireRecord(): RecordHandle {
  if (!readyRecord) throw new RecordNotReadyError();
  return readyRecord;
}
export async function rawDatabaseUri(adapters?: RecordAdapters): Promise<string> {
  return `${(await adaptersOrDefault(adapters)).storage.root}/${name}`;
}
export function createLaunchSentinel(storage: RecordStorage) {
  const path = `${storage.root}/launch-sentinel`;
  return {
    read: async (): Promise<string | null> => await storage.exists(path) ? storage.readText(path) : null,
    write: async (build: string): Promise<void> => { await storage.writeText(path, build); },
    clear: async (): Promise<void> => { await storage.remove(path); },
  };
}
export const launchSentinel = {
  read: async () => createLaunchSentinel((await adaptersOrDefault()).storage).read(),
  write: async (build: string) => createLaunchSentinel((await adaptersOrDefault()).storage).write(build),
  clear: async () => createLaunchSentinel((await adaptersOrDefault()).storage).clear(),
};
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
    close: async () => { if (readyRecord === handle) readyRecord = undefined; await db.close(); connections.delete(handle); },
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
    readyRecord = undefined;
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
      await finishErase(storage);
      await finishRestore(storage);
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
        const temporary = `${path}.tmp`;
        await files.remove(temporary);
        // Bound parameters keep paths out of SQL interpolation and logs.
        await database.run('VACUUM INTO ?', [temporary.startsWith('file://') ? decodeURIComponent(temporary.slice(7)) : temporary]);
        if (!await files.exists(temporary)) throw new Error('snapshotFailed');
        await files.move(temporary, path, true);
      });
      if (failure) return fail(failure);
      snapshotExists = await storage.exists(`${storage.root}/${snapshotName}`);
      readyRecord = db;
      return { status: 'ready', handle: db, snapshotExists };
    } catch { return fail({ code: 'openFailed' }); }
  });
}

/** Caller must stop ingestion/reset client state before invoking this core. */
export function eraseRecord(adapters?: RecordAdapters): Promise<EraseRecordResult> {
  return exclusive(async () => {
    readyRecord = undefined;
    let storage: RecordStorage;
    try {
      storage = (await adaptersOrDefault(adapters)).storage;
      await closeConnections(storage.root);
    } catch {
      logEvent('record_failure', { errorCode: 'eraseFailed' });
      return { ok: false, remaining: ['connections-or-storage'] };
    }
    const trash = `${storage.root}.erasing`;
    try {
      await finishErase(storage);
      // Renaming preserves the directory's backup-exclusion attribute with its data.
      if (await storage.exists(storage.root)) await storage.move(storage.root, trash);
      await finishErase(storage);
      if (!await storage.exists(storage.root) && !await storage.exists(trash)) return { ok: true };
    } catch { /* An unverifiable removal is not success. */ }
    logEvent('record_failure', { errorCode: 'eraseFailed' });
    return { ok: false, remaining: [storage.root, trash] };
  });
}

/** Keeps the snapshot for retry after interruption; reopen through openRecord afterward. */
export function restoreSnapshot(adapters?: RecordAdapters): Promise<RestoreSnapshotResult> {
  return exclusive(async () => {
    readyRecord = undefined;
    try {
      const { storage } = await adaptersOrDefault(adapters);
      await closeConnections(storage.root);
      await finishErase(storage);
      const snapshot = `${storage.root}/${snapshotName}`;
      if (!await storage.exists(snapshot)) return { ok: false, code: 'snapshotMissing' };
      await storage.writeText(`${storage.root}/${restoreMarker}`, 'pending');
      if (!await storage.exists(`${storage.root}/${restoreMarker}`)) throw new Error('restoreFailed');
      await finishRestore(storage);
      return { ok: true };
    } catch {
      logEvent('record_failure', { errorCode: 'restoreFailed' });
      return { ok: false, code: 'restoreFailed' };
    }
  });
}
