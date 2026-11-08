import type { ExportSection } from '@/lib/contracts/export-section';
import { toIsoWithOffset } from '@/lib/utils/time';
import { createProfileRepository } from './profile-repository';

export const profileExportSection: ExportSection = {
  key: 'profile', version: 1, owner: 'profile', tables: ['profile'],
  async read(tx) {
    const result = await createProfileRepository(tx).read();
    return { records: result.rows.map(({ createdAt, weightOrigin, ...profile }) => ({
      ...profile, createdAt: toIsoWithOffset(createdAt),
      weightOrigin: weightOrigin.kind === 'typed' ? weightOrigin : { ...weightOrigin, sampleTime: toIsoWithOffset(weightOrigin.sampleTime) },
    })), skippedCount: result.skippedCount };
  },
};
