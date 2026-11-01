import { z } from 'zod';
import { parseRows } from './parse-rows';

test('validates rows, skips and counts invalid rows without changing the input', () => {
  const output = jest.spyOn(console, 'info').mockImplementation(() => {});
  const raw = Object.freeze([{ id: 'valid', count: 1 }, { id: 'bad', count: 'one' }, null]);
  expect(parseRows(z.object({ id: z.string(), count: z.number() }), raw)).toEqual({
    rows: [{ id: 'valid', count: 1 }], skippedCount: 2,
  });
  expect(raw).toHaveLength(3);
  expect(parseRows(z.string(), [])).toEqual({ rows: [], skippedCount: 0 });
  output.mockRestore();
});
