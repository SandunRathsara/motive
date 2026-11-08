import type { ExportSection } from '@/lib/contracts/export-section';
import { toIsoWithOffset } from '@/lib/utils/time';
import { createPlanRepository } from './plan-repository';

export const planExportSection = {
  key: 'plan', version: 1, owner: 'plan', tables: ['plan_version', 'starting_estimate'],
  async read(tx) {
    const repository = createPlanRepository(tx);
    const versions = await repository.listVersions();
    const estimates = await repository.readStartingEstimate();
    return { records: [
      ...estimates.rows.map(({ createdAt, ...estimate }) => ({ kind: 'startingEstimate' as const, ...estimate, createdAt: toIsoWithOffset(createdAt) })),
      ...versions.rows.map(({ createdAt, ...version }) => ({ kind: 'planVersion' as const, ...version, createdAt: toIsoWithOffset(createdAt) })),
    ], skippedCount: versions.skippedCount + estimates.skippedCount };
  },
} satisfies ExportSection;
