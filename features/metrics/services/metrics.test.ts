import { mkdtemp, mkdir, access, rm, copyFile, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildId } from '@/lib/build';
import { openRecord, requireRecord, type RecordAdapters } from '@/lib/persistence';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { metrics } from './metrics';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'motive-metrics-'));
  const adapters: RecordAdapters = {
    storage: {
      root, prepare: async () => { await mkdir(root, { recursive: true }); },
      exists: async (path) => { try { await access(path); return true; } catch { return false; } },
      remove: (path) => rm(path, { force: true, recursive: true }),
      copy: copyFile, move: rename, readText: (path) => readFile(path, 'utf8'), writeText: (path, value) => writeFile(path, value),
    },
    openDatabase: async (directory, name) => nodeExecutor(join(directory, name)),
  };
  expect((await openRecord(adapters)).status).toBe('ready');
});
afterEach(async () => { await requireRecord().close(); await rm(root, { recursive: true, force: true }); jest.restoreAllMocks(); });

test('record/list round trip stamps UUID, default build and epoch milliseconds', async () => {
  const before = Date.now();
  await metrics.record({ event_type: 'set_logging', duration_ms: 230 });
  await metrics.record({ event_type: 'unclean_exit' }, '1.0.0+previous');
  const { rows, skippedCount } = await metrics.list({ from: before, to: Date.now() });
  expect(skippedCount).toBe(0);
  expect(rows).toHaveLength(2);
  expect(rows.find((row) => row.event_type === 'set_logging')).toMatchObject({ duration_ms: 230, build: buildId });
  expect(rows.find((row) => row.event_type === 'unclean_exit')).toMatchObject({ duration_ms: null, build: '1.0.0+previous' });
  for (const row of rows) {
    expect(row.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    expect(row.recorded_at).toBeGreaterThanOrEqual(before);
    expect(row.recorded_at).toBeLessThanOrEqual(Date.now());
  }
});
test('invalid stored row is skipped, counted and logged once, but never deleted', async () => {
  const logged = jest.spyOn(console, 'info').mockImplementation(() => {});
  await requireRecord().run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['bad-id', 'set_logging', -1, buildId, 10]);
  await metrics.record({ event_type: 'unclean_exit' });
  const result = await metrics.list({ from: 0, to: Date.now() });
  expect(result.rows).toHaveLength(1);
  expect(result.skippedCount).toBe(1);
  expect(logged).toHaveBeenCalledTimes(1);
  expect(logged).toHaveBeenCalledWith('rows_skipped', { count: 1 });
  expect(await requireRecord().getFirst('SELECT count(*) AS count FROM gate_metric')).toEqual({ count: 2 });
});
