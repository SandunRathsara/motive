/** Formats a load or rep count without floating-point noise, e.g. 82.5 → "82.5". */
export function formatQuantity(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function spokenKilograms(value: number): string {
  return `${formatQuantity(value)} ${value === 1 ? 'kilogram' : 'kilograms'}`;
}

export function spokenReps(value: number): string {
  return `${formatQuantity(value)} ${value === 1 ? 'rep' : 'reps'}`;
}
