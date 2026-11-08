import { useSyncExternalStore } from 'react';
import { faultInjection } from '../services/fault-injection';

export function useFaultInjection() {
  const { available, armed } = useSyncExternalStore(faultInjection.subscribe, faultInjection.getState, faultInjection.getState);
  return { available, armed, arm: faultInjection.arm };
}
export type FaultInjectionViewModel = ReturnType<typeof useFaultInjection>;
