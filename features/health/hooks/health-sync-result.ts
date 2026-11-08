import type { HealthSyncResult } from '../services/health-sync';

export function healthSyncFailed(result: HealthSyncResult | undefined): boolean {
  return !!result?.error || !!result?.types.some((row) => row.errors.some((error) =>
    error.kind === 'queryFailed' || error.kind === 'invalidStoredData'));
}
