import { useEffect } from 'react';
import { logEvent } from '@/lib/logger';
import { subscribeUncleanExit } from '../services/unclean-exit';

export function useUncleanExitTracking(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    return subscribeUncleanExit(() => logEvent('record_failure', { errorCode: 'metricTrackingFailed' }));
  }, [ready]);
}
