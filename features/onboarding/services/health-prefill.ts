import { getHealthSync, getTrendWeight, readHealthSnapshot } from '@/features/health';
import { nutritionInputBounds } from '@/features/nutrition';
import type { ProfileInput } from '@/features/profile';
import { dayKey } from '@/lib/utils/time';

export const healthPrefillTimeoutMs = 8_000;
export type HealthWeightPrefill = { weightKg: number; origin: Extract<ProfileInput['weightOrigin'], { kind: 'health' }> };
export async function healthPrefillAvailable() {
  try { return (await getHealthSync().isAvailable()); } catch { return false; }
}
export async function prefillHealthWeight(): Promise<HealthWeightPrefill | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const read = async (): Promise<HealthWeightPrefill | null> => {
    const snapshot = await readHealthSnapshot();
    if (!snapshot.available) return null;
    const availability = snapshot.availability.find((row) => row.type === 'bodyMass');
    const sync = getHealthSync();
    if (!availability || availability.state === 'notRequested') await sync.connect();
    else if (availability.state === 'requested') await sync.sync('refresh');
    else return null;
    const now = Date.now();
    const trend = await getTrendWeight(dayKey(now), { now });
    if (!trend.known || !Number.isFinite(trend.value) || trend.value < nutritionInputBounds.weightKg.min || trend.value > nutritionInputBounds.weightKg.max || !trend.provenance.length) return null;
    const latest = trend.provenance.reduce((a, b) => a.sampleTime > b.sampleTime ? a : b);
    return { weightKg: trend.value, origin: { kind: 'health', sampleTime: latest.sampleTime, sourceName: [...new Set(trend.provenance.map((sample) => sample.source.name))].join(', ') } };
  };
  try {
    return await Promise.race([read(), new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), healthPrefillTimeoutMs); })]);
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
