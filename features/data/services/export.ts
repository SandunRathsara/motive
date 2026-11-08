import { buildIdentity, type BuildIdentity } from '@/lib/build';
import type { ExportSection } from '@/lib/contracts/export-section';
import { logEvent } from '@/lib/logger';
import { recordStorage, requireRecord, type RecordStorage, type SqlExecutor } from '@/lib/persistence';
import { toIsoWithOffset } from '@/lib/utils/time';
import { useRecordLifecycle, type RecordLifecycleState } from '@/store/record-lifecycle';
import { canonicalUnits, exportEnvelopeSchema } from '../data.schemas';
import { exportSections } from '../registry/export-sections';
import { faultInjection } from './fault-injection';
import { nativeShare, type ShareAdapter } from './share';

export type ExportErrorCode = 'storageFull' | 'writeFailed' | 'validationFailed' | 'cancelled' | 'sharingUnavailable' | 'shareFailed' | 'cleanupFailed' | 'busy';
export type ExportResult =
  | { ok: true; skippedCount: number; skippedRowCounts: Record<string, number> }
  | { ok: false; code: ExportErrorCode };

export interface ExportDependencies {
  record(): SqlExecutor;
  storage(): Promise<RecordStorage>;
  share: ShareAdapter;
  sections: readonly ExportSection[];
  build: BuildIdentity;
  now(): number;
  lifecycle(): Pick<RecordLifecycleState, 'beginExport' | 'endExport'>;
  pauseAt(point: 'afterStaging'): Promise<void>;
}

async function removeStaging(storage: RecordStorage, path: string): Promise<void> {
  await storage.remove(path);
  if (await storage.exists(path)) throw new Error('stagingRemaining');
}

export function createExportService(deps: ExportDependencies) {
  return {
    /** Cancellation is honored before presenting the sheet; an open sheet must resolve first. */
    async export(signal?: AbortSignal): Promise<ExportResult> {
      const lifecycle = deps.lifecycle();
      if (!lifecycle.beginExport()) return { ok: false, code: 'busy' };
      let storage: RecordStorage | undefined;
      let staged: string | undefined;
      let outcome: ExportResult;
      let failure: Exclude<ExportErrorCode, 'busy'> = 'validationFailed';
      const checkCancelled = () => {
        if (signal?.aborted) { failure = 'cancelled'; throw new Error('cancelled'); }
      };
      try {
        checkCancelled();
        const exportedAt = toIsoWithOffset(deps.now());
        const snapshot = await deps.record().transaction(async (tx) => {
          const version = await tx.getFirst<{ user_version: number }>('PRAGMA user_version');
          const sections: Record<string, unknown> = {};
          const skippedRowCounts: Record<string, number> = {};
          for (const section of deps.sections) {
            if (Object.hasOwn(sections, section.key)) throw new Error('duplicateSectionKey');
            const result = await section.read(tx);
            sections[section.key] = { version: section.version, owner: section.owner, records: result.records };
            skippedRowCounts[section.key] = result.skippedCount;
          }
          return { schemaVersion: version?.user_version, sections, skippedRowCounts };
        });
        const envelope = exportEnvelopeSchema.parse({
          format: 'motive-personal-health-record', formatVersion: 1, exportedAt,
          build: deps.build, canonicalUnits, ...snapshot,
        });
        checkCancelled();
        failure = 'writeFailed';
        storage = await deps.storage();
        staged = `${storage.root}/export-staging/motive-export-${exportedAt.slice(0, 10)}.json`;
        await storage.writeText(staged, JSON.stringify(envelope));
        await deps.pauseAt('afterStaging');
        checkCancelled();
        failure = 'shareFailed';
        const result = await deps.share.share({ uri: staged, mimeType: 'application/json', uti: 'public.json', dialogTitle: 'Export Motive data' });
        if (!result.ok) {
          logEvent('export_failed', { errorCode: result.code });
          outcome = result;
        } else {
          const skippedCount = Object.values(envelope.skippedRowCounts).reduce((total, count) => total + count, 0);
          outcome = { ok: true, skippedCount, skippedRowCounts: envelope.skippedRowCounts };
        }
      } catch (error) {
        if (failure === 'writeFailed' && error instanceof Error && /no space|ENOSPC|disk full/i.test(error.message)) failure = 'storageFull';
        logEvent('export_failed', { errorCode: failure });
        outcome = { ok: false, code: failure };
      }
      try { if (storage && staged) await removeStaging(storage, staged); }
      catch {
        logEvent('export_failed', { errorCode: 'cleanupFailed' });
        outcome = { ok: false, code: 'cleanupFailed' };
      } finally { lifecycle.endExport(); }
      if (outcome.ok) logEvent('export_finished', { count: outcome.skippedCount });
      return outcome;
    },
    /** Launch-only: openRecord.prepare recreates this backup-excluded directory. */
    async sweepStaging(): Promise<void> {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const storage = await deps.storage();
          await removeStaging(storage, `${storage.root}/export-staging`);
          return;
        } catch { if (attempt === 1) logEvent('export_failed', { errorCode: 'stagingSweepFailed' }); }
      }
    },
  };
}

export const exportService = createExportService({
  record: requireRecord, storage: recordStorage, share: nativeShare, sections: exportSections,
  build: buildIdentity, now: Date.now, lifecycle: useRecordLifecycle.getState, pauseAt: faultInjection.pauseAt,
});

export const sweepExportStaging = exportService.sweepStaging;
