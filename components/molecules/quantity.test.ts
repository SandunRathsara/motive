import { formatQuantity, spokenKilograms, spokenReps } from './quantity';

test.each([[80, '80'], [82.5, '82.5'], [1.25, '1.25'], [0, '0'], [0.1 + 0.2, '0.3']])('formats %s as %s', (value, text) => {
  expect(formatQuantity(value)).toBe(text);
});

test('speaks singular and plural units', () => {
  expect(spokenKilograms(1)).toBe('1 kilogram');
  expect(spokenKilograms(80)).toBe('80 kilograms');
  expect(spokenKilograms(82.5)).toBe('82.5 kilograms');
  expect(spokenReps(1)).toBe('1 rep');
  expect(spokenReps(9)).toBe('9 reps');
});
