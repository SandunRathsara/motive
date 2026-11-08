import { useRouter } from 'expo-router';
import { PlaceholderTemplate } from '@/components/templates/PlaceholderTemplate';
import { TodayTrendLine } from '@/components/organisms/TodayTrendLine';
import { useTodayTrendLine } from '@/features/health';
export default function TodayRoute() {
  const router = useRouter();
  const trend = useTodayTrendLine();
  return <PlaceholderTemplate title="Today" message="Your daily overview is coming next. There’s nothing you need to do here yet."
    onOpenSettings={() => router.push('/settings')}
    trendLine={<TodayTrendLine candidate={trend.data ?? null}
      onPress={(type) => router.push({ pathname: '/settings/signal/[type]', params: { type } })} />} />;
}
