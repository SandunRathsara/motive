import { nodeExecutor } from './testing/node-executor';

test('queued unrelated writes are not rolled back with a failed transaction', async () => {
  const db = nodeExecutor();
  try {
    await db.exec('CREATE TABLE entries (id INTEGER)');
    const failed = db.transaction(async (tx) => {
      await tx.run('INSERT INTO entries VALUES (?)', [1]);
      throw new Error('abort');
    });
    const outside = db.run('INSERT INTO entries VALUES (?)', [2]);
    await expect(failed).rejects.toThrow('abort');
    await outside;
    expect(await db.getAll('SELECT id FROM entries')).toEqual([{ id: 2 }]);
  } finally { await db.close(); }
  await expect(db.exec('SELECT 1')).rejects.toThrow('connectionClosed');
  await db.close();
});

test('transaction results are returned after committing', async () => {
  const db = nodeExecutor();
  try {
    expect(await db.transaction(async (tx) => {
      await tx.exec('CREATE TABLE entries(id)');
      await tx.run('INSERT INTO entries VALUES (?)', [1]);
      return tx.getFirst('SELECT id FROM entries');
    })).toEqual({ id: 1 });
    expect(await db.getFirst('SELECT id FROM entries')).toEqual({ id: 1 });
  } finally { await db.close(); }
});
