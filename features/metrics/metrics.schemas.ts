import { z } from 'zod';

const timedType = z.enum(['food_active_input', 'recognition_wait', 'set_logging']);
/** Current Gate Metrics vocabulary, in display order. Later slices append event types. */
export const metricEventTypes = [...timedType.options, 'unclean_exit'] as const;
export type MetricEventType = typeof metricEventTypes[number];
const duration = z.number().int().nonnegative();
export const metricEventSchema = z.discriminatedUnion('event_type', [
  z.object({ event_type: z.literal('unclean_exit') }).strict(),
  z.object({ event_type: timedType, duration_ms: duration }).strict(),
]);
const stamp = {
  id: z.uuid(),
  build: z.string().min(1).max(128),
  recorded_at: z.number().int().nonnegative(),
};
export const metricRowSchema = z.discriminatedUnion('event_type', [
  z.object({ ...stamp, event_type: z.literal('unclean_exit'), duration_ms: z.null() }).strict(),
  z.object({ ...stamp, event_type: timedType, duration_ms: duration }).strict(),
]);
export type MetricEvent = z.infer<typeof metricEventSchema>;
export type MetricRow = z.infer<typeof metricRowSchema>;
