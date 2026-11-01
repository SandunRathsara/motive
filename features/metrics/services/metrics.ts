import { z } from 'zod';
import { buildId } from '@/lib/build';
import { parseRows, requireRecord } from '@/lib/persistence';
import { metricEventSchema, metricRowSchema, type MetricEvent } from '../metrics.schemas';

export const metrics = {
  async record(event: MetricEvent, build: string = buildId): Promise<void> {
    const parsed = metricEventSchema.parse(event);
    const stamp = z.string().min(1).max(128).parse(build);
    // SQLite supplies a v4 UUID; do not assume Hermes provides Web Crypto.
    await requireRecord().run(`INSERT INTO gate_metric (id, event_type, duration_ms, build, recorded_at)
      VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
      substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random() % 4) + 1, 1) ||
      substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))), ?, ?, ?, ?)`,
    [parsed.event_type, parsed.event_type === 'unclean_exit' ? null : parsed.duration_ms, stamp, Date.now()]);
  },
  async list(range: { from: number; to: number }) {
    const { from, to } = z.object({ from: z.number().int().nonnegative(), to: z.number().int().nonnegative() })
      .strict().refine((value) => value.from <= value.to).parse(range);
    const result = parseRows(metricRowSchema, await requireRecord().getAll(
      'SELECT * FROM gate_metric WHERE recorded_at >= ? AND recorded_at <= ? ORDER BY recorded_at, id', [from, to],
    ));
    return result;
  },
};
