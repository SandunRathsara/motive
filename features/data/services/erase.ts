import type { QueryClient } from '@tanstack/react-query';
import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { logEvent } from '@/lib/logger';
import { eraseRecord, recordStorage, type EraseRecordResult, type RecordStorage } from '@/lib/persistence';
import { queryClient } from '@/lib/query/client';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { eraseParticipants } from '../registry/erase-participants';
import { faultInjection, type FaultPoint } from './fault-injection';

export type EraseOutcome = { ok: true } | { ok: false; code: 'eraseBlocked' | 'busy' };
export type EraseStep = 'intentWritten' | 'quiesced' | 'recordDeleted' | 'participantsDeleted' | 'memoryReset' | 'verified' | 'intentRemoved';
export interface EraseKeyValueAdapter {
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
export interface EraseDependencies {
  storage: RecordStorage | (() => Promise<RecordStorage>);
  eraseRecord(): Promise<EraseRecordResult>;
  participants: readonly EraseParticipant[];
  queryClient: Pick<QueryClient, 'cancelQueries' | 'clear' | 'getQueryCache' | 'getMutationCache'>;
  lifecycle: { beginErase(): boolean; blockErase(): void; completeErase(reopen?: boolean): void };
  keyValue?: EraseKeyValueAdapter;
  pause?(point: FaultPoint): Promise<void>;
  /** Test seam: a thrown interruption aborts the run, leaving its durable intent for a new process. */
  afterStep?(step: EraseStep): Promise<void>;
}

/** Every step is idempotent: the durable sibling marker makes a new process replay the whole erase. */
export function createEraseService(deps: EraseDependencies) {
  let confirmedRunPending = false;
  const keys = deps.participants.flatMap((participant) => [...participant.keys ?? []]);
  if (deps.participants.some((participant) => participant.keys !== undefined) && !deps.keyValue) throw new Error('keyValueAdapterRequired');
  const storage = () => typeof deps.storage === 'function' ? deps.storage() : Promise.resolve(deps.storage);
  const blocked = (): EraseOutcome => {
    deps.lifecycle.blockErase();
    logEvent('erase_failed', { errorCode: 'eraseBlocked' });
    return { ok: false, code: 'eraseBlocked' };
  };
  const run = async (reopen: boolean): Promise<EraseOutcome> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      let interrupted = false;
      const checkpoint = async (step: EraseStep) => {
        try { await deps.afterStep?.(step); }
        catch (error) { interrupted = true; throw error; }
      };
      try {
        const files = await storage();
        const marker = `${files.root}.erase-intent`;
        await files.writeText(marker, 'pending');
        if (!await files.exists(marker)) throw new Error('eraseIntentMissing');
        await checkpoint('intentWritten');
        for (const participant of deps.participants) await participant.quiesce();
        await deps.queryClient.cancelQueries();
        await checkpoint('quiesced');
        const roots = (await Promise.all(deps.participants.map((participant) => participant.roots?.() ?? []))).flat();
        // No participant may consume the marker itself or its parent directory.
        if (roots.some((root) => marker === root || marker.startsWith(`${root.replace(/\/$/, '')}/`))) throw new Error('eraseIntentInsideParticipant');
        if (!(await deps.eraseRecord()).ok) throw new Error('eraseFailed');
        await deps.pause?.('afterDatabaseDeleted');
        await checkpoint('recordDeleted');
        for (const root of roots) await files.remove(root);
        for (const key of keys) await deps.keyValue!.remove(key);
        await checkpoint('participantsDeleted');
        for (const participant of deps.participants) await participant.reset();
        deps.queryClient.clear();
        await checkpoint('memoryReset');
        for (const root of [files.root, `${files.root}.erasing`, ...roots]) {
          if (await files.exists(root)) throw new Error('eraseUnverified');
        }
        for (const key of keys) if (await deps.keyValue!.exists(key)) throw new Error('eraseUnverified');
        for (const participant of deps.participants) if (!await participant.isClear()) throw new Error('eraseUnverified');
        if (deps.queryClient.getQueryCache().getAll().length || deps.queryClient.getMutationCache().getAll().length) throw new Error('eraseUnverified');
        await checkpoint('verified');
        await files.remove(marker);
        if (await files.exists(marker)) throw new Error('eraseIntentRemaining');
        await checkpoint('intentRemoved');
        logEvent('erase_finished');
        confirmedRunPending = false;
        deps.lifecycle.completeErase(reopen);
        return { ok: true };
      } catch (error) {
        if (interrupted) throw error;
        // Keep the intent and refuse writes throughout bounded retries.
      }
    }
    return blocked();
  };
  const start = (reopen: boolean, confirmed = false): Promise<EraseOutcome> => {
    if (!deps.lifecycle.beginErase()) return Promise.resolve({ ok: false, code: 'busy' });
    if (confirmed) confirmedRunPending = true;
    return run(reopen);
  };
  return {
    eraseAll: () => start(true, true),
    async retryBlocked(): Promise<EraseOutcome> {
      if (confirmedRunPending) return start(true);
      if (!deps.lifecycle.beginErase()) return { ok: false, code: 'busy' };
      try {
        const files = await storage();
        if (await files.exists(`${files.root}.erase-intent`)) return run(true);
      } catch { return blocked(); }
      // No erase was authorized. Bump the generation so the blocked launch gate opens the intact record.
      deps.lifecycle.completeErase(true);
      return { ok: true };
    },
    async resumePendingErase(): Promise<EraseOutcome> {
      try {
        const files = await storage();
        if (!await files.exists(`${files.root}.erase-intent`)) return { ok: true };
      } catch {
        if (!deps.lifecycle.beginErase()) return { ok: false, code: 'busy' };
        return blocked();
      }
      // The launch opener already owns the fresh open; do not trigger a second open via generation.
      return start(false);
    },
  };
}

export const eraseService = createEraseService({
  storage: recordStorage, eraseRecord, participants: eraseParticipants, queryClient,
  lifecycle: useRecordLifecycle.getState(), pause: (point) => faultInjection.pauseAt(point),
});
export const eraseAll = eraseService.eraseAll;
export const retryBlockedErase = eraseService.retryBlocked;
export const resumePendingErase = eraseService.resumePendingErase;
