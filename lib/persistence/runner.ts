import type { SqlExecutor } from './executor';
import { migrations, type Migration } from './migrations';
import { z } from 'zod';

const versionRow = z.object({ user_version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
const integrityRows = (mode: 'quick_check' | 'integrity_check') => z.array(z.strictObject({ [mode]: z.literal('ok') })).length(1);

export type RecordFailure =
  | { code: 'openFailed' }
  | { code: 'integrityFailed' }
  | { code: 'migrationFailed'; from: number; to: number }
  | { code: 'newerSchema'; found: number; supported: number };

export async function schemaVersion(db: SqlExecutor): Promise<number> {
  return versionRow.parse(await db.getFirst<unknown>('PRAGMA user_version')).user_version;
}

export async function checkIntegrity(db: SqlExecutor, mode: 'quick_check' | 'integrity_check'): Promise<boolean> {
  try {
    const rows = await db.getAll<Record<string, unknown>>(`PRAGMA ${mode}`);
    return integrityRows(mode).safeParse(rows).success;
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
  const version = await schemaVersion(db);
  if (version > supported) return { code: 'newerSchema', found: version, supported };
  if (version === supported) return null;
  if (!await checkIntegrity(db, 'integrity_check')) return { code: 'integrityFailed' };
  try { if (version > 0) await snapshot(); } catch { return { code: 'migrationFailed', from: version, to: supported }; }
  let failingVersion = version + 1;
  try {
    await db.transaction(async (tx) => {
      for (const migration of list.filter((item) => item.version > version)) {
        failingVersion = migration.version;
        await tx.exec(migration.sql);
        await tx.exec(`PRAGMA user_version = ${migration.version}`);
      }
    });
  } catch { return { code: 'migrationFailed', from: version, to: failingVersion }; }
  return null;
}
