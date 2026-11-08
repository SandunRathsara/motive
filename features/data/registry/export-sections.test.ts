import { migrations } from '@/lib/persistence';
import { migrateRecord } from '@/lib/persistence/runner';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { excludedTables, exportSections } from './export-sections';

test('every migrated table is exported or explicitly excluded as migration bookkeeping', async () => {
  const db = nodeExecutor();
  try {
    expect(await migrateRecord(db, async () => {}, migrations)).toBeNull();
    const rows = await db.getAll<{ name: string }>("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT GLOB 'sqlite_*' ORDER BY name");
    const tables = rows.map(({ name }) => name);
    const keys = exportSections.map(({ key }) => key);
    expect(new Set(keys).size).toBe(keys.length);
    const claims = exportSections.flatMap(({ tables }) => [...tables]);
    expect(new Set(claims).size).toBe(claims.length);
    for (const claimed of claims) expect(tables).toContain(claimed);
    for (const [excluded, reason] of Object.entries(excludedTables)) {
      expect(tables).toContain(excluded);
      expect(reason.trim().length).toBeGreaterThan(0);
      expect(claims).not.toContain(excluded);
    }
    for (const table of tables) {
      expect({ table, covered: claims.includes(table) || Object.hasOwn(excludedTables, table) }).toEqual({ table, covered: true });
    }
  } finally { await db.close(); }
});
