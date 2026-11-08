import { metrics, metricEventTypes } from '@/features/metrics';
import { logEvent } from '@/lib/logger';
import { summarizeGateMetrics, type GateReportOptions, type GateReportSummary } from '../report.utils';

export interface GateReport extends GateReportSummary { skippedCount: number }
type LoadGateReportOptions = Omit<GateReportOptions, 'eventTypes'>;

export class GateReportError extends Error {
  readonly code = 'reportFailed';
  constructor() {
    super('Could not load the report. Try again.');
    this.name = 'GateReportError';
  }
}

export async function loadGateReport(options: LoadGateReportOptions = {}): Promise<GateReport> {
  try {
    const { rows, skippedCount } = await metrics.list({ from: 0, to: Date.now() });
    return { ...summarizeGateMetrics(rows, { ...options, eventTypes: metricEventTypes }), skippedCount };
  } catch {
    logEvent('report_failed', { errorCode: 'reportFailed' });
    throw new GateReportError();
  }
}
