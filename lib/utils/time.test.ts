import { dayKey, toIsoWithOffset } from './time';

const colombo = () => 330;
const newYork = () => -300;
// 2026-11-08T03:59:59.000Z
const instant = Date.UTC(2026, 10, 8, 3, 59, 59);

test('ISO-8601 carries the explicit local offset', () => {
  expect(toIsoWithOffset(instant, colombo)).toBe('2026-11-08T09:29:59.000+05:30');
  expect(toIsoWithOffset(instant, newYork)).toBe('2026-11-07T22:59:59.000-05:00');
  expect(toIsoWithOffset(instant, () => 0)).toBe('2026-11-08T03:59:59.000+00:00');
});

test('days roll over at 04:00 local time, not midnight', () => {
  // 03:59:59 local belongs to the previous day; 04:00:00 starts the new one.
  expect(dayKey(Date.UTC(2026, 10, 8, 3, 59, 59), () => 0)).toBe('2026-11-07');
  expect(dayKey(Date.UTC(2026, 10, 8, 4, 0, 0), () => 0)).toBe('2026-11-08');
  // 09:29 in Colombo is after 04:00 on 8 November.
  expect(dayKey(instant, colombo)).toBe('2026-11-08');
  // 22:59 on 7 November in New York.
  expect(dayKey(instant, newYork)).toBe('2026-11-07');
});
