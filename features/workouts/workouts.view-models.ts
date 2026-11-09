import type { HealthWorkout } from '@/features/health';
import { workoutActivityName } from '@/features/health';
import { formatMinutes } from './workouts.format';

/** Shared by every screen's view model: loading and error states are the same everywhere (DATA-2 copy lives here too). */
export type Loadable<Content> =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({ status: 'ready' } & Content);

/** The query facts a view model needs, so any `useQuery` result fits without importing TanStack here. */
export interface QueryLike<Data> {
  isPending: boolean;
  isError: boolean;
  data: Data | undefined;
  refetch: () => unknown;
}

export function toLoadable<Data, Content>(query: QueryLike<Data>, build: (data: Data) => Content): Loadable<Content> {
  if (query.isPending) return { status: 'loading' };
  if (query.isError || query.data === undefined) return { status: 'error', retry: () => { void query.refetch(); } };
  return { status: 'ready', ...build(query.data) };
}

/** "Linked: Traditional strength training · 52 min" (context only, SIG-9). */
export const linkedWorkoutText = (workout: HealthWorkout) =>
  `Linked: ${workoutActivityName(workout.activityType)} · ${formatMinutes(workout.endMs - workout.startMs)}`;

// ---- Calm error copy ----

/** Typed errors map to short, blame-free messages (DATA-2: a failed commit is "not saved"). */
export function workoutErrorText(error: unknown): string | undefined {
  if (!error) return undefined;
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : undefined;
  switch (code) {
    case 'activeSessionExists': return 'A session is already in progress. Resume it or finish it first.';
    case 'notFound': return 'That session or set no longer exists.';
    case 'recordWritesBlocked': return 'Saving is paused while your data is exported or erased.';
    case 'invalidState': return "Those values can't be saved. Check them and try again.";
    case 'readFailed': case 'invalidRows': return "Couldn't read your training log.";
    default: return 'Not saved. Nothing was changed. Try again.';
  }
}
