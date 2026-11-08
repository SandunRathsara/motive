import { useQuery } from '@tanstack/react-query';
import type { HealthReadError, TodayTrendLineViewModel } from '../health.types';
import { todayTrendLineViewModel } from '../health.view-models';
import { readHealthSamples } from '../services/health-read';
import { healthKeys } from './query-keys';

export function useTodayTrendLine() {
  return useQuery<TodayTrendLineViewModel | null, HealthReadError>({ queryKey: healthKeys.today, queryFn: async () => {
    const rows = await readHealthSamples();
    return todayTrendLineViewModel(rows, { now: Date.now() });
  } });
}
