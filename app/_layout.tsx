import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack, ThemeProvider, useRouter } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { navigationTheme } from '@/lib/theme/navigation';
import { queryClient } from '@/lib/query/client';
import { RecoveryTemplate } from '@/components/templates/RecoveryTemplate';
import { EraseStatusTemplate } from '@/components/templates/EraseStatusTemplate';
import { useRecordGate, useRecordRecovery } from '@/features/record-recovery';
import { useUncleanExitTracking } from '@/features/metrics';
import { healthSignalTypes, signalTitles, useHealthSyncOnOpen } from '@/features/health';
import { useEraseLifecycle } from '@/features/data';
import { useRecordLifecycle } from '@/store/record-lifecycle';

export default function RootLayout() {
  const router = useRouter();
  const gate = useRecordGate();
  const recovery = useRecordRecovery(gate);
  const lifecycle = useEraseLifecycle();
  const generation = useRecordLifecycle((state) => state.eraseGeneration);
  const resetGeneration = useRef(generation);
  const resetPending = useRef(false);
  useUncleanExitTracking(gate.status === 'ready' && (lifecycle.phase === 'ready' || lifecycle.phase === 'exporting'));
  useHealthSyncOnOpen(gate.status === 'ready' && (lifecycle.phase === 'ready' || lifecycle.phase === 'exporting'));

  useEffect(() => {
    // Also cover launch-resumed erases, which deliberately don't bump the generation.
    if (lifecycle.phase === 'erasing' || lifecycle.phase === 'erase-blocked') resetPending.current = true;
    if (gate.status !== 'ready' || lifecycle.phase !== 'ready') return;
    if (!resetPending.current && resetGeneration.current === generation) return;
    resetPending.current = false;
    resetGeneration.current = generation;
    // SDK 58: use href navigation, not removed resetRoot/partial-state reset APIs.
    // Dismiss the old history first; replace also creates a fresh Today tab state.
    router.dismissAll();
    router.replace('/');
  }, [gate.status, lifecycle.phase, generation, router]);

  let content;
  // These blockers must precede opening: a resumed erase can leave the record gate opening.
  if (lifecycle.phase === 'erasing' || lifecycle.phase === 'erase-blocked') {
    content = <EraseStatusTemplate phase={lifecycle.phase} paused={lifecycle.paused} onRetry={lifecycle.retry} />;
  } else if (gate.status === 'opening') content = null;
  else if (gate.status === 'recovery') content = <RecoveryTemplate model={recovery} />;
  else content = <Stack screenOptions={{ animation: 'none', headerTransparent: false }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
    <Stack.Screen name="settings/report" options={{ title: 'Phase 1 report' }} />
    <Stack.Screen name="settings/about" options={{ title: 'About' }} />
    <Stack.Screen name="settings/signals" options={{ title: 'Health Signals' }} />
    <Stack.Screen name="settings/signal/[type]" options={({ route }) => {
      const type = (route.params as { type?: string } | undefined)?.type;
      const signal = healthSignalTypes.find((candidate) => candidate === type);
      return { title: signal ? signalTitles[signal] : 'Signal' };
    }} />
  </Stack>;
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>{content}</ThemeProvider>
    </QueryClientProvider>
  );
}
