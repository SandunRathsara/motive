import { useRouter } from 'expo-router';
import { SettingsTemplate } from '@/components/templates/SettingsTemplate';
import { useDataExport, useDeleteAllData, useEraseLifecycle, useFaultInjection } from '@/features/data';
import { useCurrentPlan } from '@/features/plan';
import { NutritionSettings } from '@/components/organisms/NutritionSettings';
import { TrainingSettings } from '@/components/organisms/TrainingSettings';
import { useTrainingSettings } from '@/features/workouts';

export default function SettingsRoute() {
  const router = useRouter();
  const exportModel = useDataExport();
  const deleteModel = useDeleteAllData();
  const lifecycle = useEraseLifecycle();
  const verification = useFaultInjection();
  const plan = useCurrentPlan();
  const training = useTrainingSettings();
  return <SettingsTemplate
    plan={<NutritionSettings state={plan.data?.status === 'present' ? plan.data.version?.snapshot ?? null : null} loading={plan.isPending}
      onRetry={() => { void plan.refetch(); }} onEdit={(field) => router.push({ pathname: '/settings/target', params: { field } })} />}
    training={<TrainingSettings model={training.model} onOpenProgram={() => router.push('/program')} />}
    data={{ exportModel, deleteModel, busy: lifecycle.phase !== 'ready',
      exportPaused: verification.available && lifecycle.paused === 'afterStaging',
      onOpenReport: () => router.push('/settings/report') }}
    about={{ onOpen: () => router.push('/settings/about') }}
    health={{ onOpen: () => router.push('/settings/signals') }}
    verification={verification.available ? verification : undefined}
  />;
}
