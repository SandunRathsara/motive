import type { ExportSection } from '@/lib/contracts/export-section';
import { toIsoWithOffset } from '@/lib/utils/time';
import type { HealthSample } from '../health.types';
import { createHealthRepository } from './health-repository';

function exportSample(sample: HealthSample) {
  const { startMs, endMs, ...fields } = sample;
  const record = { kind: 'sample' as const, ...fields, startAt: toIsoWithOffset(startMs), endAt: toIsoWithOffset(endMs) };
  // The native/cache contract uses ms for SDNN; PHR-1 exports durations in seconds.
  return sample.type === 'hrv' ? { ...record, value: sample.value / 1000, unit: 's' as const } : record;
}

export const healthSignalsExportSection: ExportSection = {
  key: 'healthSignals', version: 1, owner: 'health',
  tables: ['health_sample', 'signal_availability', 'health_sync_anchor'],
  async read(tx) {
    const repository = createHealthRepository(tx);
    const samples = await repository.listSamples();
    const availability = await repository.listAvailability();
    const anchors = await repository.listAnchors();
    return {
      records: [
        ...samples.rows.map(exportSample),
        ...availability.rows.map((row) => ({
          kind: 'availability' as const, ...row,
          lastQueryAt: row.lastQueryAt === null ? null : toIsoWithOffset(row.lastQueryAt),
          lastSampleAt: row.lastSampleAt === null ? null : toIsoWithOffset(row.lastSampleAt),
        })),
        ...anchors.rows.map(({ backfillStartMs, ...row }) => ({
          kind: 'anchor' as const, ...row, backfillStartAt: toIsoWithOffset(backfillStartMs),
        })),
      ],
      skippedCount: samples.skippedCount + availability.skippedCount + anchors.skippedCount,
    };
  },
};
