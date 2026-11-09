import type { ExportSection } from '@/lib/contracts/export-section';
import { gateMetricsExportSection } from '@/features/metrics';
import { healthSignalsExportSection } from '@/features/health';
import { profileExportSection } from '@/features/profile';
import { exerciseLibraryExportSection, trainingLogExportSection } from '@/features/workouts';
import { resolvedPlanExportSection } from '../services/plan-export-section';

/** Later slices register their feature-owned sections here. */
export const exportSections: readonly ExportSection[] = [gateMetricsExportSection, healthSignalsExportSection, profileExportSection, resolvedPlanExportSection, exerciseLibraryExportSection, trainingLogExportSection];

/** Only migration bookkeeping may be excluded, with an explicit reason. */
export const excludedTables: Readonly<Record<string, string>> = {};
