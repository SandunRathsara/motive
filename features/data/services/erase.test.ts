import { QueryClient } from '@tanstack/react-query';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { eraseRecord, openRecord, type RecordAdapters, type RecordStorage } from '@/lib/persistence';
import { nodeExecutor } from '@/lib/persistence/testing/node-executor';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { createEraseService } from './erase';

const directories: string[] = [];
const records: RecordAdapters[] = [];
const initial = useRecordLifecycle.getState();
let logged: jest.SpyInstance;
beforeEach(() => { useRecordLifecycle.setState(initial, true); logged = jest.spyOn(console, 'info').mockImplementation(() => {}); });
afterEach(async () => {
  for (const adapters of records) await eraseRecord({ ...adapters, storage: { ...adapters.storage, exists: async (path) => existsSync(path) } });
  records.length = 0;
  directories.forEach((path) => rmSync(path, { recursive: true, force: true })); directories.length = 0; jest.restoreAllMocks();
});

async function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'motive-erase-'));
  directories.push(directory);
  const root = join(directory, 'Motive');
  const storage: RecordStorage = {
    root, prepare: async () => { mkdirSync(root, { recursive: true }); },
    exists: async (path) => existsSync(path),
    remove: async (path) => { rmSync(path, { recursive: true, force: true }); },
    copy: async (from, to) => { copyFileSync(from, to); }, move: async (from, to) => { renameSync(from, to); },
    readText: async (path) => readFileSync(path, 'utf8'), writeText: async (path, text) => { writeFileSync(path, text); },
  };
  const adapters: RecordAdapters = { storage, openDatabase: async (path, name) => nodeExecutor(join(path, name)) };
  records.push(adapters);
  const opened = await openRecord(adapters);
  if (opened.status !== 'ready') throw new Error('test record failed to open');
  await opened.handle.run('INSERT INTO gate_metric VALUES (?, ?, ?, ?, ?)', ['00000000-0000-4000-8000-000000000001', 'unclean_exit', null, '1.0.0+1', 10]);
  for (const name of ['photos/draft.jpg', 'export-staging/plaintext.json', 'record.snapshot.sqlite', 'launch-sentinel']) {
    const path = join(root, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, 'private fixture');
  }
  const extra = join(directory, 'feature-files'); mkdirSync(extra); writeFileSync(join(extra, 'private.txt'), 'private fixture');
  let memory: string | null = 'private fixture';
  let quiesced = false;
  const participant: EraseParticipant = {
    key: 'fixture', owner: 'fixture', quiesce: async () => { quiesced = true; }, roots: async () => [extra],
    reset: async () => { memory = null; }, isClear: async () => memory === null,
  };
  const queries = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  queries.setQueryData(['fixture'], 'private fixture');
  queries.getMutationCache().build(queries, { mutationKey: ['fixture'] });
  const core = jest.fn(async () => { expect(quiesced).toBe(true); return eraseRecord(adapters); });
  const deps = { storage, eraseRecord: core, participants: [participant], queryClient: queries, lifecycle: useRecordLifecycle.getState() };
  return { deps, storage, root, extra, queries, participant, core };
}

test('verified erase removes the real open database, all files and memory, then removes its marker last', async () => {
  const { deps, storage, root, extra, queries, participant } = await setup();
  const remove = storage.remove;
  storage.remove = async (path) => {
    if (path === `${root}.erase-intent`) {
      expect(existsSync(root)).toBe(false); expect(existsSync(`${root}.erasing`)).toBe(false);
      expect(existsSync(extra)).toBe(false); expect(await participant.isClear()).toBe(true);
      expect(queries.getQueryCache().getAll()).toHaveLength(0); expect(queries.getMutationCache().getAll()).toHaveLength(0);
      expect(useRecordLifecycle.getState().phase).toBe('erasing');
      expect(logged).not.toHaveBeenCalledWith('erase_finished', expect.anything());
    }
    await remove(path);
  };
  expect(await createEraseService(deps).eraseAll()).toEqual({ ok: true });
  expect(existsSync(`${root}.erase-intent`)).toBe(false);
  expect(useRecordLifecycle.getState()).toMatchObject({ phase: 'ready', eraseGeneration: 1 });
  expect(logged).toHaveBeenCalledWith('erase_finished', {});
});

test.each(['intentWritten', 'quiesced', 'recordDeleted', 'participantsDeleted', 'memoryReset', 'verified', 'intentRemoved'] as const)(
  'a new process resumes after an interruption at %s', async (interruptedAt) => {
    const { deps, root, extra, queries, participant } = await setup();
    const service = createEraseService({ ...deps, afterStep: async (step) => { if (step === interruptedAt) throw new Error('process terminated'); } });
    await expect(service.eraseAll()).rejects.toThrow('process terminated');
    expect(existsSync(`${root}.erase-intent`)).toBe(interruptedAt !== 'intentRemoved');
    expect(logged).not.toHaveBeenCalledWith('erase_finished', {});
    useRecordLifecycle.setState(initial, true); // A new process, not an in-run retry.
    expect(await createEraseService(deps).resumePendingErase()).toEqual({ ok: true });
    for (const path of [root, `${root}.erasing`, `${root}.erase-intent`, extra]) expect(existsSync(path)).toBe(false);
    expect(await participant.isClear()).toBe(true);
    expect(queries.getQueryCache().getAll()).toHaveLength(0); expect(queries.getMutationCache().getAll()).toHaveLength(0);
    expect(useRecordLifecycle.getState()).toMatchObject({ phase: 'ready', eraseGeneration: 0 });
  },
);

test('failed memory verification retries three times, keeps intent, refuses writes, and can retry later', async () => {
  const { deps, participant, root, core } = await setup();
  participant.isClear = async () => false;
  const service = createEraseService(deps);
  expect(await service.eraseAll()).toEqual({ ok: false, code: 'eraseBlocked' });
  expect(core).toHaveBeenCalledTimes(3);
  expect(existsSync(`${root}.erase-intent`)).toBe(true);
  expect(useRecordLifecycle.getState()).toMatchObject({ phase: 'erase-blocked', eraseGeneration: 0 });
  expect(logged).toHaveBeenCalledWith('erase_failed', { errorCode: 'eraseBlocked' });
  expect(logged).not.toHaveBeenCalledWith('erase_finished', {});
  participant.isClear = async () => true;
  expect(await service.eraseAll()).toEqual({ ok: true });
  expect(useRecordLifecycle.getState()).toMatchObject({ phase: 'ready', eraseGeneration: 1 });
});

test.each(['root', 'trash', 'participant', 'query', 'mutation', 'marker'] as const)('unverifiable %s never reports success or clears the intent', async (remaining) => {
  const { deps, root, extra, storage, queries, core } = await setup();
  const exists = storage.exists;
  if (remaining === 'root' || remaining === 'trash' || remaining === 'participant') {
    // Refuse absence verification only after the core actually removed the real database tree.
    const target = remaining === 'root' ? root : remaining === 'trash' ? `${root}.erasing` : extra;
    storage.exists = async (path) => {
      if (core.mock.results.some((result) => result.type === 'return') && !existsSync(root) && path === target) throw new Error('cannot inspect');
      return exists(path);
    };
  } else if (remaining === 'marker') {
    const remove = storage.remove;
    storage.remove = async (path) => { if (path !== `${root}.erase-intent`) await remove(path); };
  } else {
    const clear = queries.clear.bind(queries);
    queries.clear = () => {
      clear();
      if (remaining === 'query') queries.setQueryData(['late'], 'private fixture');
      else queries.getMutationCache().build(queries, { mutationKey: ['late'] });
    };
  }
  expect(await createEraseService(deps).eraseAll()).toEqual({ ok: false, code: 'eraseBlocked' });
  expect(existsSync(`${root}.erase-intent`)).toBe(true);
  expect(useRecordLifecycle.getState()).toMatchObject({ phase: 'erase-blocked', eraseGeneration: 0 });
  expect(logged).not.toHaveBeenCalledWith('erase_finished', {});
});

test('keys require an explicit adapter and key absence is verified before success', async () => {
  const { deps, participant, root } = await setup();
  const keyed = { ...participant, keys: ['fixture-key'] };
  expect(() => createEraseService({ ...deps, participants: [keyed] })).toThrow('keyValueAdapterRequired');
  expect(() => createEraseService({ ...deps, participants: [{ ...participant, keys: [] }] })).toThrow('keyValueAdapterRequired');
  expect(existsSync(join(root, 'record.sqlite'))).toBe(true);
  const values = new Map([['fixture-key', 'private fixture']]);
  const keyValue = { remove: async (_key: string) => {}, exists: async (key: string) => values.has(key) };
  const service = createEraseService({ ...deps, participants: [keyed], keyValue });
  expect(await service.eraseAll()).toEqual({ ok: false, code: 'eraseBlocked' });
  expect(existsSync(`${root}.erase-intent`)).toBe(true);
  keyValue.remove = async (key) => { values.delete(key); };
  expect(await service.eraseAll()).toEqual({ ok: true });
  expect(values.size).toBe(0);
});

test('no intent means no automatic erasure; a busy lifecycle refuses an explicit erase', async () => {
  const { deps, core, root } = await setup();
  const service = createEraseService(deps);
  expect(await service.resumePendingErase()).toEqual({ ok: true });
  expect(core).not.toHaveBeenCalled();
  useRecordLifecycle.getState().beginExport();
  expect(await service.eraseAll()).toEqual({ ok: false, code: 'busy' });
  expect(existsSync(`${root}.erase-intent`)).toBe(false);
  expect(existsSync(join(root, 'record.sqlite'))).toBe(true);
});

test('the intent must be verified before quiescing or removing anything', async () => {
  const { deps, storage, core, root, participant } = await setup();
  participant.quiesce = jest.fn(participant.quiesce);
  const exists = storage.exists;
  storage.exists = async (path) => path === `${root}.erase-intent` ? false : exists(path);
  expect(await createEraseService(deps).eraseAll()).toEqual({ ok: false, code: 'eraseBlocked' });
  expect(core).not.toHaveBeenCalled(); expect(participant.quiesce).not.toHaveBeenCalled();
  expect(existsSync(join(root, 'record.sqlite'))).toBe(true);
});

test('unreadable launch intent blocks without interpreting uncertainty as permission to erase', async () => {
  const { deps, storage, core, root } = await setup();
  storage.exists = async () => { throw new Error('cannot inspect'); };
  expect(await createEraseService(deps).resumePendingErase()).toEqual({ ok: false, code: 'eraseBlocked' });
  expect(core).not.toHaveBeenCalled(); expect(existsSync(join(root, 'record.sqlite'))).toBe(true);
});

test('the verification pause occurs with the database gone but the durable intent still present', async () => {
  const { deps, root } = await setup();
  const pause = jest.fn(async () => {
    expect(existsSync(root)).toBe(false);
    expect(existsSync(`${root}.erase-intent`)).toBe(true);
    expect(useRecordLifecycle.getState().phase).toBe('erasing');
  });
  expect(await createEraseService({ ...deps, pause }).eraseAll()).toEqual({ ok: true });
  expect(pause).toHaveBeenCalledWith('afterDatabaseDeleted');
});
