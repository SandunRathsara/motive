/** Test-only adapter: never import this module from production source. */
import { DatabaseSync } from 'node:sqlite';
import { serializeExecutor, type SqlExecutor } from '../executor';

export function nodeExecutor(path = ':memory:'): SqlExecutor {
  const db = new DatabaseSync(path);
  return serializeExecutor({
    exec: async (sql) => { db.exec(sql); },
    run: async (sql, params = []) => { db.prepare(sql).run(...params); },
    getFirst: async <T>(sql: string, params = []) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    getAll: async <T>(sql: string, params = []) => db.prepare(sql).all(...params) as T[],
    close: async () => { db.close(); },
  });
}
