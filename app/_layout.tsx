import '../global.css';
import { Stack } from 'expo-router';
import { RecoveryTemplate } from '@/components/templates/RecoveryTemplate';
import { useRecordGate, useRecordRecovery } from '@/features/record-recovery';
import { useUncleanExitTracking } from '@/features/metrics';

export default function RootLayout() {
  const gate = useRecordGate();
  const recovery = useRecordRecovery(gate);
  useUncleanExitTracking(gate.status === 'ready');
  if (gate.status === 'opening') return null;
  if (gate.status === 'recovery') return <RecoveryTemplate model={recovery} />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none', statusBarStyle: 'light' }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
