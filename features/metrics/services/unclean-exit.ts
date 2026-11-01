import { AppState } from 'react-native';
import { buildId } from '@/lib/build';
import { launchSentinel } from '@/lib/persistence';
import { metrics } from './metrics';
import { recoverUncleanExit, trackAppState } from '../metrics.utils';

let startup: Promise<void> | undefined;
let queue = Promise.resolve();
export function subscribeUncleanExit(onError: () => void): () => void {
  const enqueue = (state: typeof AppState.currentState) => {
    queue = queue.then(async () => {
      // Effect replays must not reinterpret this launch's sentinel as a previous crash.
      // If recovery fails, preserve the old sentinel and retry before any new writes.
      startup ??= recoverUncleanExit(launchSentinel, metrics.record).catch((error: unknown) => {
        startup = undefined;
        throw error;
      });
      await startup;
      await trackAppState(state, launchSentinel, buildId);
    }).catch(onError);
  };
  enqueue(AppState.currentState);
  const subscription = AppState.addEventListener('change', enqueue);
  return () => subscription.remove();
}
