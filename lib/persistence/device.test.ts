import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import { recordDirectoryModule } from '@/lib/native/record-directory';
import { deviceAdapters } from './device';

jest.mock('expo-file-system', () => ({
  Directory: jest.fn(() => ({ create: jest.fn(), delete: jest.fn(), move: jest.fn(), list: jest.fn(() => []) })),
  File: jest.fn(() => ({ copy: jest.fn(), delete: jest.fn(), move: jest.fn() })),
  Paths: { info: jest.fn(() => ({ exists: false, isDirectory: null })) },
}));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('@/lib/native/record-directory', () => ({ recordDirectoryModule: jest.fn() }));

const root = 'file:///sandbox/Library/Application%20Support/Motive';
const native = {
  directory: jest.fn(async () => `${root}/`),
  prepareDirectory: jest.fn(async () => {}),
  directoryExists: jest.fn(async () => true),
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(recordDirectoryModule).mockReturnValue(native);
});

test('default wiring reapplies native backup exclusion and reserves durable child directories', async () => {
  const { storage } = await deviceAdapters();
  await storage.prepare();
  await storage.prepare();
  expect(storage.root).toBe(root);
  expect(native.prepareDirectory).toHaveBeenCalledTimes(2);
  expect(Directory).toHaveBeenCalledWith(root, 'photos');
  expect(Directory).toHaveBeenCalledWith(root, 'export-staging');
});

test('backup-exclusion failure is not silently ignored', async () => {
  native.prepareDirectory.mockRejectedValueOnce(new Error('attribute failure'));
  const { storage } = await deviceAdapters();
  await expect(storage.prepare()).rejects.toThrow('attribute failure');
  expect(Directory).not.toHaveBeenCalled();
});

test('erasure verification uses the native check and propagates permission errors', async () => {
  const { storage } = await deviceAdapters();
  native.directoryExists.mockRejectedValueOnce(new Error('permission denied'));
  await expect(storage.exists(root)).rejects.toThrow('permission denied');
  expect(Paths.info).not.toHaveBeenCalled();
});

test('database opener explicitly supplies the Application Support directory and a new connection', async () => {
  const closeAsync = jest.fn(async () => {});
  jest.mocked(openDatabaseAsync).mockResolvedValue({ closeAsync } as unknown as Awaited<ReturnType<typeof openDatabaseAsync>>);
  const adapters = await deviceAdapters();
  const db = await adapters.openDatabase(root, 'record.sqlite');
  expect(openDatabaseAsync).toHaveBeenCalledWith('record.sqlite', { useNewConnection: true }, root);
  await db.close();
  expect(closeAsync).toHaveBeenCalledTimes(1);
});

test('file deletion is idempotent and deletes whole directories when present', async () => {
  const { storage } = await deviceAdapters();
  await storage.remove(root);
  expect(Directory).not.toHaveBeenCalled();
  jest.mocked(Paths.info).mockReturnValueOnce({ exists: true, isDirectory: true });
  await storage.remove(root);
  expect(Directory).toHaveBeenCalledWith(root);
  jest.mocked(Paths.info).mockReturnValueOnce({ exists: true, isDirectory: false });
  await storage.remove(`${root}/record.sqlite-wal`);
  expect(File).toHaveBeenCalledWith(`${root}/record.sqlite-wal`);
});

test('same-parent erasure moves the directory without overwrite; snapshot replacement opts in', async () => {
  const { storage } = await deviceAdapters();
  jest.mocked(Paths.info).mockReturnValueOnce({ exists: true, isDirectory: true });
  await storage.move(root, `${root}.erasing`);
  expect(Directory).toHaveBeenNthCalledWith(1, root);
  expect(Directory).toHaveBeenNthCalledWith(2, `${root}.erasing`);
  expect(jest.mocked(Directory).mock.results[0].value.move).toHaveBeenCalledWith(expect.anything(), { overwrite: false });
  await storage.move(`${root}/snapshot.tmp`, `${root}/snapshot`, true);
  expect(jest.mocked(File).mock.results[0].value.move).toHaveBeenCalledWith(expect.anything(), { overwrite: true });
});

test('Paths.info false is not trusted when a pending erasure parent cannot be listed', async () => {
  const { storage } = await deviceAdapters();
  jest.mocked(Directory).mockImplementationOnce(() => ({ list: () => { throw new Error('permission denied'); } }) as unknown as Directory);
  await expect(storage.exists(`${root}.erasing`)).rejects.toThrow('permission denied');
});
