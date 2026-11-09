import { clock } from './clock';

test.each([[0, '0:00'], [5, '0:05'], [90, '1:30'], [754, '12:34'], [3665, '1:01:05']])('formats %s seconds as %s', (seconds, text) => {
  expect(clock(seconds)).toBe(text);
});
