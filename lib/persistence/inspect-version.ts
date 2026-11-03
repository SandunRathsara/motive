import type { RecordAdapters, RecordStorage } from './record';
import { schemaVersion } from './runner';

/** SQLite can checkpoint/delete WAL files even when only reading user_version.
 * Probe a disposable copy so an unsupported record is byte-for-byte untouched.
 */
export async function inspectVersion(storage: RecordStorage, open: RecordAdapters['openDatabase']): Promise<number | null> {
  const source = `${storage.root}/record.sqlite`;
  if (!await storage.exists(source)) return null;
  const name = 'record.inspect.sqlite';
  const target = `${storage.root}/${name}`;
  const clean = async () => {
    for (const suffix of ['', '-wal', '-shm']) await storage.remove(`${target}${suffix}`);
  };
  await clean();
  try {
    await storage.copy(source, target);
    if (await storage.exists(`${source}-wal`)) await storage.copy(`${source}-wal`, `${target}-wal`);
    const db = await open(storage.root, name);
    try { return await schemaVersion(db); } finally { await db.close(); }
  } finally { await clean(); }
}
