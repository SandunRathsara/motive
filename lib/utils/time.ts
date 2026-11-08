/** Minutes east of UTC at an instant (device local time by default). */
export type OffsetAt = (epochMs: number) => number;
export const deviceOffset: OffsetAt = (epochMs) => -new Date(epochMs).getTimezoneOffset();

const pad = (value: number, width = 2) => String(Math.trunc(value)).padStart(width, '0');

/** ISO-8601 with an explicit numeric offset, e.g. `2026-11-08T09:30:00.000+05:30`. */
export function toIsoWithOffset(epochMs: number, offsetAt: OffsetAt = deviceOffset): string {
  const offset = offsetAt(epochMs);
  const local = new Date(epochMs + offset * 60_000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}.${pad(local.getUTCMilliseconds(), 3)}${sign}${pad(abs / 60)}:${pad(abs % 60)}`;
}

/** Local calendar day (`YYYY-MM-DD`) under the fixed 04:00 day boundary (§3, NUT-5). */
export function dayKey(epochMs: number, offsetAt: OffsetAt = deviceOffset, boundaryHour = 4): string {
  const local = new Date(epochMs + offsetAt(epochMs) * 60_000 - boundaryHour * 3_600_000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}
