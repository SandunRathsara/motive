import { useRouter } from 'expo-router';
import { TodayTemplate } from '@/components/templates/TodayTemplate';
import { TodayTrendLine } from '@/components/organisms/TodayTrendLine';
import { useTodayTrendLine } from '@/features/health';
import { useTodayPlan } from '@/features/plan';
import { useTodayTraining } from '@/features/workouts';
import { TodayTrainingCard } from '@/components/organisms/TodayTrainingCard';
import { QuickAddSet } from '@/components/molecules/QuickAddSet';
export default function TodayRoute() {
  const router = useRouter();
  const trend = useTodayTrendLine();
  const plan = useTodayPlan();
  const training = useTodayTraining();
  // Resume, or start the next template, then land on the session where the chip is one tap away.
  const openSession = () => { void training.open().then((id) => { if (id) router.push({ pathname: '/session/[id]', params: { id } }); }); };
  return <TodayTemplate model={plan}
    onOpenSettings={() => router.push('/settings')}
    onOpenTargets={() => router.push({ pathname: '/settings', params: { section: 'targets' } })}
    onEditKcal={() => router.push({ pathname: '/settings/target', params: { field: 'kcal' } })}
    onEditProtein={() => router.push({ pathname: '/settings/target', params: { field: 'protein' } })}
    training={<TodayTrainingCard model={training.model} busy={training.starting} errorText={training.errorText} onOpen={openSession} />}
    quickAdd={<QuickAddSet model={training.model} busy={training.starting} onPress={openSession} />}
    trendLine={<TodayTrendLine candidate={trend.data ?? null}
      onPress={(type) => router.push({ pathname: '/settings/signal/[type]', params: { type } })} />} />;
}
