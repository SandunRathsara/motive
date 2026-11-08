import { Redirect, useLocalSearchParams } from 'expo-router';
import { HealthReadStateTemplate } from '@/components/templates/HealthReadStateTemplate';
import { SignalDetailTemplate } from '@/components/templates/SignalDetailTemplate';
import { healthSignalTypes, signalTitles, useDeleteSignalHistory, useSignalDetail } from '@/features/health';

export default function SignalDetailRoute() {
  const { type } = useLocalSearchParams<{ type?: string | string[] }>();
  const signal = healthSignalTypes.find((candidate) => candidate === type);
  const query = useSignalDetail(signal ?? 'bodyMass');
  const deletion = useDeleteSignalHistory(signal ?? 'bodyMass');
  if (!signal) return <Redirect href="/settings/signals" />;
  if (!query.data) return <HealthReadStateTemplate title={signalTitles[signal]} failed={query.isError} onRetry={() => { void query.refetch(); }} />;
  return <SignalDetailTemplate model={{ ...query.data, deleting: deletion.isPending, deleteErrorText: deletion.errorText }}
    readFailed={query.isError} onRetry={() => { void query.refetch(); }} onDeleteHistory={() => deletion.mutate()} />;
}
