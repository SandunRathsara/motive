import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { queryClient } from '@/lib/query/client';
import { healthKeys } from './query-keys';
import { getHealthSync } from '../services/health';
import type { HealthSync } from '../services/health-sync';

/** Fire-and-forget local ingestion: never part of the record/render gate (UX-7). */
export function useHealthSyncOnOpen(enabled: boolean): void {
  const opened = useRef<HealthSync | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const sync = getHealthSync();
    let state = AppState.currentState;
    const attempt = () => {
      if (!recordWritesAllowed()) return;
      opened.current = sync;
      // Time windows and source selection can age even when no native page changes.
      void queryClient.invalidateQueries({ queryKey: healthKeys.all });
      void sync.sync('open');
    };
    if ((state === 'active' || state == null) && opened.current !== sync) attempt();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && state !== 'active') attempt();
      state = next;
    });
    return () => subscription.remove();
  }, [enabled]);
}
