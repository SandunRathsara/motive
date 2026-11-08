import { useQuery } from '@tanstack/react-query';
import type { HealthReadError, SignalsViewModel } from '../health.types';
import { signalsViewModel } from '../health.view-models';
import { readHealthSnapshot } from '../services/health';
import { healthKeys } from './query-keys';

export function useSignals() {
  return useQuery<SignalsViewModel, HealthReadError>({ queryKey: healthKeys.signals, queryFn: async () => {
    const { samples, availability, available } = await readHealthSnapshot();
    return signalsViewModel(samples, availability, available, { now: Date.now() });
  } });
}
