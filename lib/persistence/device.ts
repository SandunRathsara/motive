import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import { recordDirectoryModule } from '@/lib/native/record-directory';
import { serializeExecutor } from './executor';
import type { RecordAdapters } from './record';
import { inspectVersion } from './inspect-version';

export async function deviceAdapters(): Promise<RecordAdapters> {
  const native = recordDirectoryModule();
  const root = (await native.directory()).replace(/\/$/, '');
  const adapters: RecordAdapters = {
    storage: {
      root,
      prepare: async () => {
        await native.prepareDirectory();
        for (const name of ['photos', 'export-staging']) {
          new Directory(root, name).create({ intermediates: true, idempotent: true });
        }
      },
      exists: async (path) => {
        if (path === root) return native.directoryExists();
        if (Paths.info(path).exists) return true;
        // Paths.info also returns false without read permission. Listing the parent
        // must succeed before absence is trusted (especially for pending erasure).
        const slash = path.lastIndexOf('/');
        const parent = path.slice(0, slash);
        if (parent === root && !await native.directoryExists()) return false;
        return new Directory(parent).list().some((entry) => entry.uri.replace(/\/$/, '') === path);
      },
      remove: async (path) => {
        const info = Paths.info(path);
        if (info.exists) {
          if (info.isDirectory) new Directory(path).delete();
          else new File(path).delete();
        }
      },
      copy: async (from, to) => { await new File(from).copy(new File(to)); },
      move: async (from, to, overwrite = false) => {
        if (Paths.info(from).isDirectory) await new Directory(from).move(new Directory(to), { overwrite });
        else await new File(from).move(new File(to), { overwrite });
      },
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
  adapters.inspectVersion = () => inspectVersion(adapters.storage, adapters.openDatabase);
  return adapters;
}
