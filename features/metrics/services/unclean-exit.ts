import { AppState } from 'react-native';
import { buildId } from '@/lib/build';
import { launchSentinel } from '@/lib/persistence';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { metrics } from './metrics';
import { recoverUncleanExit, trackAppState } from '../metrics.utils';

let startup: Promise<void> | undefined;
let queue: Promise<void> | undefined;
let generation = 0;
const subscriptions = new Set<{ remove(): void }>();

export async function quiesceUncleanExitTracking(): Promise<void> {
  generation++;
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions.clear();
  // Drain a sentinel write already in flight before the record directory is removed.
  await queue;
}
export async function resetUncleanExitTracking(): Promise<void> { startup = undefined; queue = undefined; }
export async function clearUncleanExitTracking(): Promise<boolean> { return startup === undefined && queue === undefined && subscriptions.size === 0; }

export function subscribeUncleanExit(onError: () => void): () => void {
  if (!recordWritesAllowed()) return () => {};
  const subscribedGeneration = generation;
  const enqueue = (state: typeof AppState.currentState) => {
    if (subscribedGeneration !== generation || !recordWritesAllowed()) return;
    queue = (queue ?? Promise.resolve()).then(async () => {
      if (subscribedGeneration !== generation || !recordWritesAllowed()) return;
      // Effect replays must not reinterpret this launch's sentinel as a previous crash.
      // If recovery fails, preserve the old sentinel and retry before any new writes.
      startup ??= recoverUncleanExit(launchSentinel, metrics.record).catch((error: unknown) => {
        startup = undefined;
        throw error;
      });
      await startup;
      if (subscribedGeneration !== generation || !recordWritesAllowed()) return;
      await trackAppState(state, launchSentinel, buildId);
    }).catch(onError);
  };
  enqueue(AppState.currentState);
  const subscription = AppState.addEventListener('change', enqueue);
  subscriptions.add(subscription);
  return () => { subscription.remove(); subscriptions.delete(subscription); };
}
