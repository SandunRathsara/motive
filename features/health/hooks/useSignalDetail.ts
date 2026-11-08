import { useQuery } from '@tanstack/react-query';
import type { HealthSignalType, HealthReadError, SignalDetailViewModel } from '../health.types';
import { signalDetailViewModel } from '../health.view-models';
import { readHealthSnapshot } from '../services/health';
import { healthKeys } from './query-keys';

export function useSignalDetail(type: HealthSignalType) {
  return useQuery<SignalDetailViewModel, HealthReadError>({ queryKey: healthKeys.detail(type), queryFn: async () => {
    const { samples, availability, available } = await readHealthSnapshot();
    return signalDetailViewModel(samples, availability, available, type, { now: Date.now() });
  } });
}
