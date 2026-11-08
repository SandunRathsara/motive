import { useRouter } from 'expo-router';
import { SettingsTemplate } from '@/components/templates/SettingsTemplate';
import { useDataExport, useDeleteAllData, useEraseLifecycle, useFaultInjection } from '@/features/data';

export default function SettingsRoute() {
  const router = useRouter();
  const exportModel = useDataExport();
  const deleteModel = useDeleteAllData();
  const lifecycle = useEraseLifecycle();
  const verification = useFaultInjection();
  return <SettingsTemplate
    data={{ exportModel, deleteModel, busy: lifecycle.phase !== 'ready',
      exportPaused: verification.available && lifecycle.paused === 'afterStaging',
      onOpenReport: () => router.push('/settings/report') }}
    about={{ onOpen: () => router.push('/settings/about') }}
    verification={verification.available ? verification : undefined}
  />;
}
