import { requireNativeModule } from 'expo';
import { z } from 'zod';

interface RecordDirectoryModule {
  directory(): Promise<string>;
  directoryExists(): Promise<boolean>;
  prepareDirectory(): Promise<void>;
}

export function recordDirectoryModule(): RecordDirectoryModule {
  const native = requireNativeModule<RecordDirectoryModule>('MotiveRecordDirectory');
  return {
    directory: async () => z.string().startsWith('file://').parse(await native.directory()),
    directoryExists: async () => z.boolean().parse(await native.directoryExists()),
    prepareDirectory: () => native.prepareDirectory(),
  };
}
