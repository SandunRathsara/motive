import type { ExportSection } from '@/lib/contracts/export-section';
import { gateMetricsExportSection } from '@/features/metrics';
import { healthSignalsExportSection } from '@/features/health';

/** Later slices register their feature-owned sections here. */
export const exportSections: readonly ExportSection[] = [gateMetricsExportSection, healthSignalsExportSection];

/** Only migration bookkeeping may be excluded, with an explicit reason. */
export const excludedTables: Readonly<Record<string, string>> = {};
