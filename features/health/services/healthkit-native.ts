import { requireNativeModule } from 'expo';
import { z } from 'zod';

import { healthKitPageSchema } from '../health.schemas';
import type { HealthSignalType } from '../health.types';
import type { HealthKitAdapter } from './healthkit.contract';

interface NativeHealthKitModule {
  isAvailable(): Promise<unknown>;
  requestReadAuthorization(): Promise<void>;
  requestStatus(type: HealthSignalType): Promise<unknown>;
  anchoredFetch(type: HealthSignalType, anchor: string | null, startMs: number | null, limit: number): Promise<unknown>;
}

const requestStatusSchema = z.enum(['shouldRequest', 'unnecessary', 'unknown']);

export function createNativeHealthKitAdapter(): HealthKitAdapter {
  // Resolve on construction, not import: web/Jest/Expo Go can still load the feature.
  // Lookup failure becomes unavailable; native invocation/validation failures still reject.
  let native: NativeHealthKitModule | null;
  try {
    native = requireNativeModule<NativeHealthKitModule>('MotiveHealthKit');
  } catch {
    native = null;
  }
  const requireModule = () => {
    if (!native) throw new Error('E_HEALTHKIT_UNAVAILABLE');
    return native;
  };
  return {
    isAvailable: async () => native ? z.boolean().parse(await native.isAvailable()) : false,
    requestReadAuthorization: async () => requireModule().requestReadAuthorization(),
    requestStatus: async (type) => requestStatusSchema.parse(await requireModule().requestStatus(type)),
    // Samples stay unknown: the sync service skips/counts invalid items without losing the page.
    anchoredFetch: async (type, input) => healthKitPageSchema.parse(
      await requireModule().anchoredFetch(type, input.anchor, input.startMs, input.limit),
    ),
  };
}
