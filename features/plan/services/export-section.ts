import type { ExportSection } from '@/lib/contracts/export-section';
import { toIsoWithOffset } from '@/lib/utils/time';
import { createPlanRepository } from './plan-repository';

export const planExportSection: ExportSection = {
  key: 'plan', version: 1, owner: 'plan', tables: ['plan_version', 'starting_estimate'],
  async read(tx) {
    const repository = createPlanRepository(tx);
    const versions = await repository.listVersions();
    const estimates = await repository.readStartingEstimate();
    return { records: [
      ...estimates.rows.map(({ createdAt, ...estimate }) => ({ kind: 'startingEstimate', ...estimate, createdAt: toIsoWithOffset(createdAt) })),
      ...versions.rows.map(({ createdAt, ...version }) => ({ kind: 'planVersion', ...version, createdAt: toIsoWithOffset(createdAt) })),
    ], skippedCount: versions.skippedCount + estimates.skippedCount };
  },
};
