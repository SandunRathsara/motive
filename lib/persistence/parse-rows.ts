import type { ZodType } from 'zod';
import { logEvent } from '@/lib/logger';

/** Invalid rows stay on disk; repositories decide how to surface the count. */
export function parseRows<T>(schema: ZodType<T>, rawRows: readonly unknown[]): { rows: T[]; skippedCount: number } {
  const rows: T[] = [];
  let skippedCount = 0;
  for (const raw of rawRows) {
    const parsed = schema.safeParse(raw);
    if (parsed.success) rows.push(parsed.data);
    else skippedCount++;
  }
  if (skippedCount) logEvent('rows_skipped', { count: skippedCount });
  return { rows, skippedCount };
}
