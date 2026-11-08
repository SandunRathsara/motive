import { requireRecord, type SqlExecutor } from '@/lib/persistence';
import { logEvent } from '@/lib/logger';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { healthSignalTypes, type HealthSignalType, type HealthSyncError, type SignalAvailability } from '../health.types';
import { healthSampleDtoSchema, type HealthSampleDto } from '../health.schemas';
import { createHealthRepository } from './health-repository';
import type { HealthKitAdapter } from './healthkit.contract';

export interface HealthSyncDependencies {
  adapter: HealthKitAdapter;
  connection?: SqlExecutor | (() => SqlExecutor);
  now?: () => number;
  pageLimit?: number;
}

export interface HealthTypeSyncResult {
  type: HealthSignalType;
  /** Null when no validated persisted or newly observed state is available. */
  availability: SignalAvailability | null;
  addedCount: number;
  deletedCount: number;
  skippedCount: number;
  errors: HealthSyncError[];
}
export interface HealthSyncResult {
  trigger: 'open' | 'refresh';
  types: HealthTypeSyncResult[];
  error?: { kind: 'stopped' | 'writesBlocked' | 'queryFailed' };
}
export type HealthDeleteHistoryResult = { ok: true } | { ok: false; error: { kind: 'stopped' | 'writesBlocked' } | { kind: 'queryFailed'; type: HealthSignalType } };

export function createHealthSync(deps: HealthSyncDependencies) {
  const connection = () => typeof deps.connection === 'function' ? deps.connection() : deps.connection ?? requireRecord();
  const now = deps.now ?? Date.now;
  let inFlight: Promise<HealthSyncResult> | undefined;
  let connecting: Promise<HealthSyncResult> | undefined;
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(work);
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
  let stopped = false;
  let openAttempted = Promise.resolve();
  function trackOpen(trigger: 'open' | 'refresh', pending: Promise<HealthSyncResult>): Promise<HealthSyncResult> {
    if (trigger === 'open') openAttempted = pending.then(() => undefined, () => undefined);
    return pending;
  }
  const listeners = new Set<(types: readonly HealthSignalType[]) => void>();
  const emit = (type: HealthSignalType) => {
    for (const listener of listeners) {
      try { listener([type]); } catch { /* A subscriber cannot undo a committed page or interrupt ingestion. */ }
    }
  };
  const guard = () => {
    if (stopped || !recordWritesAllowed()) throw new Error('healthSyncInterrupted');
  };
  const refused = (trigger: 'open' | 'refresh'): HealthSyncResult & { error: { kind: 'stopped' | 'writesBlocked' } } => ({ trigger, types: [], error: { kind: stopped ? 'stopped' : 'writesBlocked' } });
  const service = {
    isAvailable: () => deps.adapter.isAvailable(),
    deleteHistory(type: HealthSignalType): Promise<HealthDeleteHistoryResult> {
      return enqueue(async () => {
        try {
          guard();
          await connection().transaction(async (tx) => {
            guard();
            const writer = createHealthRepository(tx);
            const previous = (await writer.listAvailability()).rows.find((row) => row.type === type);
            await writer.purgeType(type);
            if (previous) await writer.setAvailability(previous.state === 'requested'
              ? { ...previous, lastSampleAt: null, readState: 'noReadableSamples' }
              : { ...previous, lastSampleAt: null });
            guard();
          });
          emit(type);
          return { ok: true };
        } catch {
          return { ok: false, error: stopped || !recordWritesAllowed() ? refused('refresh').error! : { kind: 'queryFailed', type } };
        }
      });
    },
    onCommitted(listener: (types: readonly HealthSignalType[]) => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    connect: (): Promise<HealthSyncResult> => start('refresh', true),
    async stopIngestion(): Promise<void> {
      stopped = true;
      await Promise.all([tail, inFlight, connecting]);
    },
    /** Erased instances stay stopped. The app must create/register a new instance after reopening. */
    async reset(): Promise<void> {
      await service.stopIngestion();
      listeners.clear();
    },
    isClear: (): boolean => stopped && inFlight === undefined && connecting === undefined && listeners.size === 0,
    refreshOnOpenAttempted: () => openAttempted,
    sync: (trigger: 'open' | 'refresh'): Promise<HealthSyncResult> => start(trigger),
  };
  function start(trigger: 'open' | 'refresh', authorize = false): Promise<HealthSyncResult> {
    if (stopped || !recordWritesAllowed()) {
      return trackOpen(trigger, Promise.resolve(refused(trigger)));
    }
    const existing = authorize ? connecting : inFlight;
    if (existing) {
      return trackOpen(trigger, existing);
    }
    const pending = enqueue(() => run(trigger, authorize)).catch(() => {
      if (stopped || !recordWritesAllowed()) return refused(trigger);
      logEvent('health_sync_failed', { errorCode: 'healthQueryFailed' });
      return { trigger, types: [], error: { kind: 'queryFailed' as const } };
    }).finally(() => {
      if (inFlight === pending) inFlight = undefined;
      if (connecting === pending) connecting = undefined;
    });
    inFlight = pending;
    if (authorize) connecting = pending;
    return trackOpen(trigger, pending);
  }
  async function run(trigger: 'open' | 'refresh', authorize: boolean): Promise<HealthSyncResult> {
    guard();
    const db = connection();
    const repository = createHealthRepository(db);
    const results: HealthTypeSyncResult[] = [];
    const available = await deps.adapter.isAvailable();
    guard();
    if (authorize && available) {
      await deps.adapter.requestReadAuthorization();
      guard();
    }
    for (const type of healthSignalTypes) {
      guard();
      const storedAvailability = await repository.listAvailability(type);
      const storedAnchors = await repository.listAnchors(type);
      const previous = storedAvailability.rows[0];
      const invalidCount = storedAvailability.skippedCount + storedAnchors.skippedCount;
      if (invalidCount) {
        results.push({ type, availability: previous ?? null, addedCount: 0, deletedCount: 0, skippedCount: invalidCount,
          errors: [{ kind: 'invalidStoredData', type }] });
        continue;
      }
      const times = { lastQueryAt: previous?.lastQueryAt ?? null, lastSampleAt: previous?.lastSampleAt ?? null };
      let persisted: SignalAvailability | null = previous ?? null;
      let availability = persisted;
      const result: HealthTypeSyncResult = { type, availability, addedCount: 0, deletedCount: 0, skippedCount: 0, errors: [] };
      try {
        if (!available) {
          availability = { type, ...times, state: 'unavailableOnDevice', readState: null };
          result.errors.push({ kind: 'unavailable' });
          logEvent('health_sync_failed', { errorCode: 'healthUnavailable' });
          // 'unknown' is not evidence of a previous request: do not fetch it (HK-1).
        } else if (await deps.adapter.requestStatus(type) === 'unnecessary') {
          guard();
          const queriedAt = now();
          availability = { type, ...times, state: 'requested', readState: null, lastQueryAt: queriedAt };
          const saved = storedAnchors.rows[0];
          const backfillStartMs = saved?.backfillStartMs ?? now() - 90 * 86_400_000;
          // Fix the first-attempt bound even if its first native query fails. No cursor advances here.
          guard();
          if (!saved) await repository.setAnchor({ type, anchor: null, backfillStartMs });
          let anchor = saved?.anchor ?? null;
          let hasMore: boolean;
          do {
            guard();
            const page = await deps.adapter.anchoredFetch(type, { anchor, startMs: backfillStartMs, limit: deps.pageLimit ?? 500 });
            guard();
            const samples: HealthSampleDto[] = [];
            let skipped = 0;
            for (const raw of page.samples) {
              const parsed = healthSampleDtoSchema.safeParse(raw);
              if (parsed.success && parsed.data.type === type) samples.push(parsed.data);
              else skipped++;
            }
            result.skippedCount += skipped;
            if (skipped) logEvent('rows_skipped', { count: skipped });
            availability = await db.transaction(async (tx): Promise<SignalAvailability> => {
              guard();
              const writer = createHealthRepository(tx);
              await writer.upsertSamples(samples);
              await writer.deleteByUuids(type, page.deletedUuids);
              // Empty HealthKit reads can hide denial while returning a cursor past unread history.
              if (page.samples.length > 0 || page.deletedUuids.length > 0) {
                await writer.setAnchor({ type, anchor: page.anchor, backfillStartMs });
              }
              const cached = (await writer.listSamples(type)).rows;
              const next: SignalAvailability = { type, state: 'requested',
                readState: cached.length ? 'hasSamples' : 'noReadableSamples', lastQueryAt: queriedAt,
                lastSampleAt: cached.reduce<number | null>((latest, sample) => latest === null ? sample.endMs : Math.max(latest, sample.endMs), null),
              };
              await writer.setAvailability(next);
              guard();
              return next;
            });
            persisted = availability;
            result.addedCount += samples.length;
            result.deletedCount += page.deletedUuids.length;
            if (samples.length || page.deletedUuids.length) emit(type);
            // Native filtering can leave an empty DTO page with hasMore: continue in memory only.
            anchor = page.anchor;
            hasMore = page.hasMore;
          } while (hasMore);
        } else {
          availability = { type, ...times, state: 'notRequested', readState: null };
        }
      } catch {
        guard();
        logEvent('health_sync_failed', { errorCode: 'healthQueryFailed' });
        result.errors.push({ kind: 'queryFailed', type });
        if (availability?.state === 'requested') availability = { ...availability, readState: 'queryError', lastQueryAt: now() };
      }
      if (result.skippedCount) result.errors.push({ kind: 'validationSkipped', type, count: result.skippedCount });
      guard();
      if (availability) {
        try {
          if (availability !== persisted) await repository.setAvailability(availability);
          if (!previous || previous.state !== availability.state || previous.readState !== availability.readState ||
            previous.lastQueryAt !== availability.lastQueryAt || previous.lastSampleAt !== availability.lastSampleAt) emit(type);
        } catch {
          guard();
          logEvent('health_sync_failed', { errorCode: 'healthQueryFailed' });
          if (!result.errors.some((error) => error.kind === 'queryFailed')) result.errors.push({ kind: 'queryFailed', type });
          availability = persisted;
        }
      }
      result.availability = availability;
      results.push(result);
    }
    logEvent('health_sync_finished', { count: results.reduce((count, result) => count + result.addedCount, 0) });
    return { trigger, types: results };
  }
  return service;
}

export type HealthSync = ReturnType<typeof createHealthSync>;
