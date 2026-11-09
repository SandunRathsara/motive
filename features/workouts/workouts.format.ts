import { deviceOffset, type OffsetAt } from '@/lib/utils/time';

/** Deterministic display formatting for training screens (no locale lookups, so output never varies by device). */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const [whole, fraction] = String(rounded).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}

export const formatKg = (value: number) => `${formatNumber(value)} kg`;

/** "80 × 9", or "9 reps" for a reps-only set. */
export function formatSet(loadKg: number | null, reps: number): string {
  return loadKg === null ? formatReps(reps) : `${formatNumber(loadKg)} × ${formatNumber(reps)}`;
}

export const formatReps = (reps: number) => `${formatNumber(reps)} ${reps === 1 ? 'rep' : 'reps'}`;

export function spokenSet(loadKg: number | null, reps: number): string {
  const rep = formatReps(reps);
  return loadKg === null ? rep : `${formatNumber(loadKg)} ${loadKg === 1 ? 'kilogram' : 'kilograms'}, ${rep}`;
}

export const plural = (count: number, word: string) => `${formatNumber(count)} ${word}${count === 1 ? '' : 's'}`;

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon 9 Nov" in the device zone (the calendar date of the instant, not the 04:00 training day). */
export function formatDate(epochMs: number, offsetAt: OffsetAt = deviceOffset): string {
  const local = new Date(epochMs + offsetAt(epochMs) * 60_000);
  return `${weekdays[local.getUTCDay()]} ${local.getUTCDate()} ${months[local.getUTCMonth()]}`;
}

/** 24-hour "07:05". */
export function formatTime(epochMs: number, offsetAt: OffsetAt = deviceOffset): string {
  const local = new Date(epochMs + offsetAt(epochMs) * 60_000);
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatMinutes(ms: number): string {
  return `${Math.max(1, Math.round(ms / 60_000))} min`;
}
