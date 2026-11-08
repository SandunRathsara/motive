import { useRouter } from 'expo-router';
import { HealthReadStateTemplate } from '@/components/templates/HealthReadStateTemplate';
import { SignalsTemplate } from '@/components/templates/SignalsTemplate';
import { useConnectHealth, useHealthRefresh, useSignals } from '@/features/health';

export default function SignalsRoute() {
  const router = useRouter();
  const query = useSignals();
  const refresh = useHealthRefresh();
  const connect = useConnectHealth();
  if (!query.data) return <HealthReadStateTemplate title="Health Signals" failed={query.isError} onRetry={() => { void query.refetch(); }} />;
  return <SignalsTemplate model={query.data} refreshing={refresh.isPending} connecting={connect.isPending}
    feedbackText={query.isError ? 'Couldn’t refresh cached signals. Showing the last loaded values.' : refresh.errorText ?? connect.errorText}
    onRefresh={() => refresh.mutate()} onConnect={() => connect.mutate()}
    onOpenSignal={(type) => router.push({ pathname: '/settings/signal/[type]', params: { type } })} />;
}
