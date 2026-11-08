import { useFaultInjectionStore } from '@/store/fault-injection';
import { faultInjection } from '../services/fault-injection';

export function useFaultInjection() {
  const armed = useFaultInjectionStore((state) => state.armed);
  return { available: faultInjection.available, armed, arm: faultInjection.arm };
}
export type FaultInjectionViewModel = ReturnType<typeof useFaultInjection>;
