import { requireRecord, type SqlConnection, type SqlExecutor } from '@/lib/persistence';
import { planChangesSchema, planStateSchema, type PlanChanges, type PlanField, type PlanSource, type PlanVersion } from '../plan.schemas';
import { assertPlanWritesAllowed, createPlanRepository, planDiff, PlanStoreError } from './plan-repository';

export type PlanStatus = { status: 'none' | 'present' | 'invalid'; version: PlanVersion | null; skippedCount: number };
export type PlanAppendResult = { version: PlanVersion | null; changedFields: PlanField[] };

/**
 * Appends a Plan Version inside a transaction the caller owns, so another feature can commit it together
 * with its own writes (`appendVersion` opens its own transaction, and nesting is unsupported). The caller
 * calls `planStore.notifyCommitted(result)` after its outer transaction resolves.
 */
export async function appendVersionIn(tx: SqlConnection, source: PlanSource, changes: PlanChanges, createdAt: number): Promise<PlanAppendResult> {
  assertPlanWritesAllowed();
  const repository = createPlanRepository(tx);
  const versions = await repository.listVersions();
  if (versions.skippedCount) throw new PlanStoreError('invalidRows', versions.skippedCount);
  const current = versions.rows[0];
  if (!current) throw new PlanStoreError('noPlan');
  const parsed = planChangesSchema.safeParse(changes);
  if (!parsed.success) throw new PlanStoreError('invalidState');
  const next = planStateSchema.safeParse({ ...current.snapshot, ...parsed.data });
  if (!next.success) throw new PlanStoreError('invalidState');
  const diff = planDiff(current.snapshot, next.data);
  const changedFields = Object.keys(diff) as PlanField[];
  if (!changedFields.length) return { version: null, changedFields };
  const version: PlanVersion = {
    number: current.number + 1, createdAt,
    ...(source === 'Your edit' ? { source, sourceRef: null } : source), snapshot: next.data, diff,
  };
  await repository.insertVersion(version);
  assertPlanWritesAllowed();
  return { version, changedFields };
}

export function createPlanStore(options: { connection?: SqlExecutor; now?: () => number } = {}) {
  const listeners = new Set<(result: PlanAppendResult) => void>();
  const db = () => options.connection ?? requireRecord();
  const now = options.now ?? Date.now;
  const store = {
    list: () => createPlanRepository(options.connection).listVersions(),
    async current(): Promise<PlanStatus> {
      const result = await store.list();
      return { status: result.skippedCount ? 'invalid' : result.rows.length ? 'present' : 'none', version: result.rows[0] ?? null, skippedCount: result.skippedCount };
    },
    async byNumber(number: number): Promise<{ version: PlanVersion | null; skippedCount: number }> {
      const result = await store.list();
      return { version: result.rows.find((version) => version.number === number) ?? null, skippedCount: result.skippedCount };
    },
    async appendVersion(source: PlanSource, changes: PlanChanges): Promise<PlanAppendResult> {
      assertPlanWritesAllowed();
      const result = await Promise.resolve().then(() => db().transaction((tx) => appendVersionIn(tx, source, changes, now()))).catch((error: unknown) => {
        if (error instanceof PlanStoreError) throw error;
        throw new PlanStoreError('writeFailed');
      });
      store.notifyCommitted(result);
      return result;
    },
    async latestChangeAfter(number: number, field: PlanField) {
      const result = await store.list();
      return { version: result.rows.find((version) => version.number > number && Object.hasOwn(version.diff, field)) ?? null, skippedCount: result.skippedCount };
    },
    async nutritionTargetStart() {
      const result = await store.list();
      const fields: PlanField[] = ['goal', 'ratePreset', 'kcalTarget', 'proteinFloorG'];
      const version = result.rows.find((version) => fields.some((field) => Object.hasOwn(version.diff, field))) ?? null;
      return { createdAt: version?.createdAt ?? null, versionNumber: version?.number ?? null, skippedCount: result.skippedCount };
    },
    subscribe(listener: (result: PlanAppendResult) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Atomic orchestrators call this only after their outer transaction resolves. */
    notifyCommitted(result: PlanAppendResult) {
      if (!result.version) return;
      for (const listener of listeners) {
        try { listener(result); } catch { /* A committed write must never be reported as failed by an observer. */ }
      }
    },
    clearChangeListeners() { listeners.clear(); },
    hasChangeListeners() { return listeners.size > 0; },
  };
  return store;
}
export const planStore = createPlanStore();
