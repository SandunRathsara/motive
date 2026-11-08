import type { MetricRow } from '@/features/metrics';
import { dayKey, type OffsetAt } from '@/lib/utils/time';

type ReportMetric = Pick<MetricRow, 'build' | 'duration_ms' | 'recorded_at'> & { event_type: string };

export interface GateReportGroup {
  eventType: string;
  count: number;
  medianMs: number | null;
  p90Ms: number | null;
  p95Ms?: number | null;
}
export interface GateReportBuild { build: string; count: number }
export interface GateReportDayTotal { day: string; totalMs: number; count: number }
export interface GateReportSummary {
  groups: GateReportGroup[];
  builds: GateReportBuild[];
  uncleanExitCount: number;
  dailyTotals: GateReportDayTotal[];
}
export interface GateReportOptions {
  eventTypes: readonly string[];
  build?: string;
  offsetAt?: OffsetAt;
}

/** Rows have already been validated by their owning repository. */
export function summarizeGateMetrics(rows: readonly ReportMetric[], { eventTypes, build, offsetAt }: GateReportOptions): GateReportSummary {
  const byEvent = new Map<string, ReportMetric[]>();
  const buildCounts = new Map<string, number>();
  const dailyTotals = new Map<string, GateReportDayTotal>();
  for (const row of rows) {
    buildCounts.set(row.build, (buildCounts.get(row.build) ?? 0) + 1);
    if (build !== undefined && row.build !== build) continue;
    const samples = byEvent.get(row.event_type) ?? [];
    samples.push(row);
    byEvent.set(row.event_type, samples);
    if (row.duration_ms !== null && (row.event_type === 'food_active_input' || row.event_type === 'set_logging')) {
      const day = dayKey(row.recorded_at, offsetAt);
      const total = dailyTotals.get(day) ?? { day, totalMs: 0, count: 0 };
      total.totalMs += row.duration_ms;
      total.count += 1;
      dailyTotals.set(day, total);
    }
  }
  const knownTypes = new Set(eventTypes);
  const types = [...knownTypes, ...[...byEvent.keys()].filter((type) => !knownTypes.has(type)).sort()];
  return {
    groups: types.map((eventType) => {
      const samples = byEvent.get(eventType) ?? [];
      const durations = eventType === 'unclean_exit' ? [] :
        samples.flatMap((row) => row.duration_ms === null ? [] : [row.duration_ms]).sort((a, b) => a - b);
      const percentile = (p: number) => durations.length < 5 ? null : durations[Math.ceil(p / 100 * durations.length) - 1];
      return {
        eventType, count: samples.length, medianMs: percentile(50), p90Ms: percentile(90),
        ...(eventType === 'recognition_wait' ? { p95Ms: percentile(95) } : {}),
      };
    }),
    builds: [...buildCounts].sort(([a], [b]) => a.localeCompare(b)).map(([build, count]) => ({ build, count })),
    uncleanExitCount: byEvent.get('unclean_exit')?.length ?? 0,
    dailyTotals: [...dailyTotals.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}
