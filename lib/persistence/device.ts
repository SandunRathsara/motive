import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import { recordDirectoryModule } from '@/lib/native/record-directory';
import { serializeExecutor } from './executor';
import type { RecordAdapters } from './record';

export async function deviceAdapters(): Promise<RecordAdapters> {
  const native = recordDirectoryModule();
  const root = (await native.directory()).replace(/\/$/, '');
  return {
    storage: {
      root,
      prepare: async () => {
        await native.prepareDirectory();
        for (const name of ['photos', 'export-staging']) {
          new Directory(root, name).create({ intermediates: true, idempotent: true });
        }
      },
      exists: async (path) => path === root ? native.directoryExists() : Paths.info(path).exists,
      remove: async (path) => {
        const info = Paths.info(path);
        if (info.exists) {
          if (info.isDirectory) new Directory(path).delete();
          else new File(path).delete();
        }
      },
      copy: async (from, to) => { await new File(from).copy(new File(to)); },
      readText: (path) => new File(path).text(),
      writeText: async (path, value) => { await new File(path).write(value); },
    },
    openDatabase: async (directory, name) => {
      const db = await openDatabaseAsync(name, { useNewConnection: true }, directory);
      return serializeExecutor({
        exec: (sql) => db.execAsync(sql),
        run: async (sql, params = []) => { await db.runAsync(sql, [...params]); },
        getFirst: (sql, params = []) => db.getFirstAsync(sql, [...params]),
        getAll: (sql, params = []) => db.getAllAsync(sql, [...params]),
        close: () => db.closeAsync(),
      });
    },
  };
}
