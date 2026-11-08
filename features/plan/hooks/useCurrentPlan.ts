import { useQuery } from '@tanstack/react-query';
import { planStore, type PlanStatus } from '../services/plan-store';
import type { PlanStoreError } from '../services/plan-repository';
import { planKeys } from './query-keys';

export function useCurrentPlan() {
  return useQuery<PlanStatus, PlanStoreError>({ queryKey: planKeys.current, queryFn: () => planStore.current() });
}
