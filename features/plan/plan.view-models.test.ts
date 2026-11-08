import type { PlanVersion } from './plan.schemas';
import { planChipLabel } from './plan.view-models';

const local = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).getTime();
test.each([
  [1, local(8, 12), local(8, 12), 'Plan v1'],
  [3, local(8, 12), local(8, 23), 'Plan v3 · changed today'],
  [3, local(8, 12), local(9, 3, 59), 'Plan v3 · changed today'],
  [3, local(8, 12), local(9, 4), null],
  [1, local(8, 3), local(8, 3, 59), 'Plan v1'],
  [1, local(8, 3), local(8, 4), null],
] as const)('version %i chip uses the fixed 04:00 creation-day boundary', (number, createdAt, now, expected) => {
  expect(planChipLabel({ number, createdAt } as PlanVersion, now)).toBe(expected);
});
