import { exportEnvelopeSchema } from './data.schemas';

const envelope = {
  format: 'motive-personal-health-record',
  formatVersion: 1,
  schemaVersion: 1,
  exportedAt: '2026-11-08T09:30:00.000+05:30',
  build: { variant: 'verification', version: '1.0.0', buildNumber: '2', buildId: '1.0.0+2', gitTag: 'build/verification/1.0.0+2' },
  canonicalUnits: { bodyMass: 'kg', length: 'cm', foodMass: 'g', volume: 'ml', energy: 'kcal', duration: 's', timestamp: 'ISO-8601 with offset' },
  sections: { gateMetrics: { version: 1, owner: 'metrics', records: [{ id: 'stable-id', durationS: 1.25 }] } },
  skippedRowCounts: { gateMetrics: 2 },
};

test('the versioned envelope preserves section records and explicit offset timestamps', () => {
  expect(exportEnvelopeSchema.parse(envelope)).toEqual(envelope);
});

test.each([
  { formatVersion: 2 },
  { schemaVersion: -1 },
  { exportedAt: '2026-11-08T09:30:00' },
  { exportedAt: '2026-11-08T09:30:00Z' },
  { canonicalUnits: { ...envelope.canonicalUnits, duration: 'ms' } },
  { skippedRowCounts: {} },
  { skippedRowCounts: { gateMetrics: 0, missing: 1 } },
  { skippedRowCounts: { gateMetrics: -1 } },
  { sections: { gateMetrics: { version: 0, owner: 'metrics', records: [] } } },
  { sections: { gateMetrics: { version: 1, owner: 'metrics', records: [{ durationS: NaN }] } } },
  { sections: { gateMetrics: { version: 1, owner: 'metrics', records: [{ missing: undefined }] } } },
])('rejects invalid envelope fields %j', (change) => {
  expect(exportEnvelopeSchema.safeParse({ ...envelope, ...change }).success).toBe(false);
});
