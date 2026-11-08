import type { ExportSection } from '@/lib/contracts/export-section';
import { parseRows } from '@/lib/persistence';
import { toIsoWithOffset } from '@/lib/utils/time';
import { metricRowSchema, type MetricEventType } from '../metrics.schemas';

interface ExportedMetric {
  id: string;
  eventType: MetricEventType;
  durationS: number | null;
  build: string;
  recordedAt: string;
}

export const gateMetricsExportSection: ExportSection<ExportedMetric> = {
  key: 'gateMetrics', version: 1, owner: 'metrics', tables: ['gate_metric'],
  async read(tx) {
    const { rows, skippedCount } = parseRows(metricRowSchema, await tx.getAll('SELECT * FROM gate_metric ORDER BY recorded_at, id'));
    return {
      records: rows.map((row) => ({
        id: row.id, eventType: row.event_type, durationS: row.duration_ms === null ? null : row.duration_ms / 1000,
        build: row.build, recordedAt: toIsoWithOffset(row.recorded_at),
      })),
      skippedCount,
    };
  },
};
