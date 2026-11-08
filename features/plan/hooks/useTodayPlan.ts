import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey } from '@/lib/utils/time';
import { planChipLabel, type TodayPlanViewModel } from '../plan.view-models';
import { useCurrentPlan } from './useCurrentPlan';

export function useTodayPlan(): TodayPlanViewModel {
  const query = useCurrentPlan();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const next = new Date(now);
    next.setHours(4, 0, 0, 0);
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    const timer = setTimeout(() => setNow(Date.now()), next.getTime() - now);
    return () => clearTimeout(timer);
  }, [now]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') setNow(Date.now()); });
    return () => subscription.remove();
  }, []);
  const version = query.data?.status === 'present' ? query.data.version : null;
  return {
    status: query.isPending ? 'loading' : query.isError || !version ? 'error' : 'ready',
    dateLabel: new Date(`${dayKey(now)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    targets: version?.snapshot ?? null, chipLabel: planChipLabel(version, now), retry: () => { void query.refetch(); },
  };
}
