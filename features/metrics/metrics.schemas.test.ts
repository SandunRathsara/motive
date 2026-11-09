import { metricEventSchema, metricRowSchema } from './metrics.schemas';

test.each(['food_active_input', 'recognition_wait', 'set_logging', 'set_edit'])('timed %s requires a nonnegative integer duration', (event_type) => {
  expect(metricEventSchema.safeParse({ event_type, duration_ms: 0 }).success).toBe(true);
  for (const duration_ms of [-1, 0.1, null, undefined]) {
    expect(metricEventSchema.safeParse({ event_type, duration_ms }).success).toBe(false);
  }
});
test('unclean exits have no duration or free text', () => {
  expect(metricEventSchema.safeParse({ event_type: 'unclean_exit' }).success).toBe(true);
  for (const duration_ms of [0, null]) {
    expect(metricEventSchema.safeParse({ event_type: 'unclean_exit', duration_ms }).success).toBe(false);
  }
  expect(metricEventSchema.safeParse({ event_type: 'unclean_exit', notes: 'text' }).success).toBe(false);
  expect(metricEventSchema.safeParse({ event_type: 'set_logging', duration_ms: 1, text: 'text' }).success).toBe(false);
});
test('stored row requires validated identity, timestamps and a null unclean duration', () => {
  const row = { id: 'f7453a19-09db-4f31-8d82-542b13d8be80', event_type: 'unclean_exit', duration_ms: null, build: '1+1', recorded_at: 1 };
  expect(metricRowSchema.safeParse(row).success).toBe(true);
  for (const change of [{ id: 'bad' }, { recorded_at: 1.2 }, { duration_ms: 3 }, { notes: 'text' }]) {
    expect(metricRowSchema.safeParse({ ...row, ...change }).success).toBe(false);
  }
});
