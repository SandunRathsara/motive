import { useRouter } from 'expo-router';
import { TodayTemplate } from '@/components/templates/TodayTemplate';
import { TodayTrendLine } from '@/components/organisms/TodayTrendLine';
import { useTodayTrendLine } from '@/features/health';
import { useTodayPlan } from '@/features/plan';
export default function TodayRoute() {
  const router = useRouter();
  const trend = useTodayTrendLine();
  const plan = useTodayPlan();
  return <TodayTemplate model={plan}
    onOpenSettings={() => router.push('/settings')}
    onOpenTargets={() => router.push({ pathname: '/settings', params: { section: 'targets' } })}
    onEditKcal={() => router.push({ pathname: '/settings/target', params: { field: 'kcal' } })}
    onEditProtein={() => router.push({ pathname: '/settings/target', params: { field: 'protein' } })}
    trendLine={<TodayTrendLine candidate={trend.data ?? null}
      onPress={(type) => router.push({ pathname: '/settings/signal/[type]', params: { type } })} />} />;
}
