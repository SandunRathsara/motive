import { isHealthAvailableForPrefill, requestWeightForPrefill } from '@/features/health';
import { nutritionInputBounds } from '@/features/nutrition';
import type { ProfileInput } from '@/features/profile';

export const healthPrefillTimeoutMs = 8_000;
export type HealthWeightPrefill = { weightKg: number; origin: Extract<ProfileInput['weightOrigin'], { kind: 'health' }> };
export async function healthPrefillAvailable() {
  try { return await isHealthAvailableForPrefill(); } catch { return false; }
}
export async function prefillHealthWeight(): Promise<HealthWeightPrefill | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const read = async (): Promise<HealthWeightPrefill | null> => {
    const trend = await requestWeightForPrefill();
    if (!trend?.known || !Number.isFinite(trend.value) || trend.value < nutritionInputBounds.weightKg.min || trend.value > nutritionInputBounds.weightKg.max || !trend.provenance.length) return null;
    const latest = trend.provenance.reduce((a, b) => a.sampleTime > b.sampleTime ? a : b);
    return { weightKg: trend.value, origin: { kind: 'health', sampleTime: latest.sampleTime, sourceName: [...new Set(trend.provenance.map((sample) => sample.source.name))].join(', ') } };
  };
  try {
    return await Promise.race([read(), new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), healthPrefillTimeoutMs); })]);
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
