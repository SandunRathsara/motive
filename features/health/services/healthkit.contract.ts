import type { HealthKitPage } from '../health.schemas';
import type { HealthSignalType } from '../health.types';

export type HealthKitRequestStatus = 'shouldRequest' | 'unnecessary' | 'unknown';

/**
 * Never fetch a type before authorization was requested; the sync service enforces this.
 * The first fetch passes startMs = 90 days before the first sync (then retains that bound).
 */
export interface HealthKitAdapter {
  isAvailable(): Promise<boolean>;
  requestReadAuthorization(): Promise<void>;
  requestStatus(type: HealthSignalType): Promise<HealthKitRequestStatus>;
  anchoredFetch(type: HealthSignalType, input: {
    anchor: string | null;
    startMs: number | null;
    limit: number;
  }): Promise<HealthKitPage>;
}
