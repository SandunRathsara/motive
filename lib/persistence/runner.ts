import type { SqlExecutor } from './executor';
import { migrations, type Migration } from './migrations';

export type RecordFailure =
  | { code: 'openFailed' }
  | { code: 'integrityFailed' }
  | { code: 'migrationFailed'; from: number; to: number }
  | { code: 'newerSchema'; found: number; supported: number };

export async function schemaVersion(db: SqlExecutor): Promise<number> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  if (!row || !Number.isSafeInteger(row.user_version) || row.user_version < 0) throw new Error('invalidVersion');
  return row.user_version;
}

export async function checkIntegrity(db: SqlExecutor, mode: 'quick_check' | 'integrity_check'): Promise<boolean> {
  try {
    const rows = await db.getAll<Record<string, unknown>>(`PRAGMA ${mode}`);
    return rows.length === 1 && Object.values(rows[0]).length === 1 && Object.values(rows[0])[0] === 'ok';
  } catch { return false; }
}

export function supportedVersion(list: readonly Migration[]): number {
  // Missing/reordered migrations are a programming error, never a reason to mutate a record.
  list.forEach((item, index) => {
    if (item.version !== index + 1) throw new Error('invalidMigrationList');
  });
  return list.at(-1)?.version ?? 0;
}

export async function migrateRecord(
  db: SqlExecutor,
  snapshot: () => Promise<void>,
  list: readonly Migration[] = migrations,
): Promise<RecordFailure | null> {
  const supported = supportedVersion(list);
  let version = await schemaVersion(db);
  if (version > supported) return { code: 'newerSchema', found: version, supported };
  if (version === supported) return null;
  if (!await checkIntegrity(db, 'integrity_check')) return { code: 'integrityFailed' };
  try { await snapshot(); } catch { return { code: 'migrationFailed', from: version, to: supported }; }
  // Per-migration transactions preserve the last successfully committed version on failure.
  for (const migration of list.filter((item) => item.version > version)) {
    try {
      await db.transaction(async (tx) => {
        await tx.exec(migration.sql);
        await tx.exec(`PRAGMA user_version = ${migration.version}`);
      });
    } catch { return { code: 'migrationFailed', from: version, to: migration.version }; }
    version = migration.version;
  }
  return null;
}
