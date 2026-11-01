import type { MetricEvent } from './metrics.schemas';

export type LaunchSentinel = { read(): Promise<string | null>; write(build: string): Promise<void>; clear(): Promise<void> };
export async function recoverUncleanExit(sentinel: LaunchSentinel, record: (event: MetricEvent, build: string) => Promise<void>): Promise<void> {
  const previousBuild = await sentinel.read();
  if (previousBuild !== null) {
    await record({ event_type: 'unclean_exit' }, previousBuild);
    await sentinel.clear();
  }
}
export async function trackAppState(state: string | null | undefined, sentinel: LaunchSentinel, build: string): Promise<void> {
  if (state === 'active') await sentinel.write(build);
  // Do NOT clear on inactive: swipe-killing from the app switcher must count as unclean.
  else if (state === 'background') await sentinel.clear();
}
