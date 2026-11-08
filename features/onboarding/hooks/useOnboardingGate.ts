import { useQuery } from '@tanstack/react-query';
import type { RecordGate } from '@/features/record-recovery';
import { queryClient } from '@/lib/query/client';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { readOnboardingStatus } from '../services/read-onboarding-status';
import { onboardingKeys } from './query-keys';

export function useOnboardingGate(record: RecordGate): RecordGate & { onboardingStatus?: 'none' | 'present' } {
  const generation = useRecordLifecycle((state) => state.eraseGeneration);
  // Explicit client: the root lifecycle hooks run above the provider they render.
  const query = useQuery({ queryKey: [...onboardingKeys.status, generation], queryFn: () => readOnboardingStatus(), enabled: record.status === 'ready' }, queryClient);
  const retry = async () => { await record.retry(); await query.refetch(); };
  if (record.status !== 'ready') return record;
  if (query.isError || query.data?.status === 'invalid') return {
    ...record, status: 'recovery', snapshotExists: record.snapshotExists,
    failure: query.isError ? { code: 'readFailed' } : { code: 'invalidRows', skippedCount: query.data!.skippedCount }, retry,
  };
  if (!query.data) return { ...record, status: 'opening' };
  return { ...record, onboardingStatus: query.data.status as 'none' | 'present', retry };
}
