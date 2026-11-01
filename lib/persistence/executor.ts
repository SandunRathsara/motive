export type SqlValue = string | number | null | Uint8Array;
export type SqlParams = readonly SqlValue[];
export interface SqlConnection {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<void>;
  getFirst<T>(sql: string, params?: SqlParams): Promise<T | null>;
  getAll<T>(sql: string, params?: SqlParams): Promise<T[]>;
}
export interface SqlExecutor extends SqlConnection {
  /** Use only the supplied connection inside the callback; nested transactions are unsupported. */
  transaction<T>(work: (tx: SqlConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** All operations share a queue so unrelated writes cannot leak into a transaction. */
export function serializeExecutor(raw: SqlConnection & { close(): Promise<void> }): SqlExecutor {
  let tail: Promise<unknown> = Promise.resolve();
  let closed = false;
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(() => {
      if (closed) throw new Error('connectionClosed');
      return work();
    });
    tail = result.catch(() => undefined);
    return result;
  };
  return {
    exec: (sql) => enqueue(() => raw.exec(sql)),
    run: (sql, params) => enqueue(() => raw.run(sql, params)),
    getFirst: <T>(sql: string, params?: SqlParams) => enqueue(() => raw.getFirst<T>(sql, params)),
    getAll: <T>(sql: string, params?: SqlParams) => enqueue(() => raw.getAll<T>(sql, params)),
    transaction: (work) => enqueue(async () => {
      await raw.exec('BEGIN IMMEDIATE');
      try {
        const result = await work(raw);
        await raw.exec('COMMIT');
        return result;
      } catch (error) {
        try { await raw.exec('ROLLBACK'); } catch { /* Preserve the original failure. */ }
        throw error;
      }
    }),
    close: () => closed ? Promise.resolve() : enqueue(async () => {
      await raw.close();
      closed = true;
    }),
  };
}
