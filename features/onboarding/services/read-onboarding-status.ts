import { requireRecord, type SqlExecutor } from '@/lib/persistence';
import { createProfileRepository } from '@/features/profile';
import { createPlanRepository } from '@/features/plan';
import { OnboardingError } from './complete-onboarding';

/** DATA-6: a partially present or invalid setup is Recovery, never a fresh install. */
export async function readOnboardingStatus(connection?: SqlExecutor): Promise<{ status: 'none' | 'present' | 'invalid'; skippedCount: number }> {
  try {
    return await (connection ?? requireRecord()).transaction(async (tx) => {
      const profile = await createProfileRepository(tx).read();
      const plans = createPlanRepository(tx);
      const versions = await plans.listVersions();
      const estimate = await plans.readStartingEstimate();
      const skippedCount = profile.skippedCount + versions.skippedCount + estimate.skippedCount;
      const present = [profile.profile !== null, versions.rows.length > 0, estimate.estimate !== null];
      return {
        status: skippedCount || (present.some(Boolean) && !present.every(Boolean)) ? 'invalid' : present.every(Boolean) ? 'present' : 'none',
        skippedCount,
      };
    });
  } catch { throw new OnboardingError('readFailed'); }
}
