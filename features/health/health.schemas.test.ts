import { healthKitPageSchema, healthSampleDtoSchema } from './health.schemas';

const common = {
  uuid: 'A7453A19-09DB-4F31-8D82-542B13D8BE80',
  startMs: 1_794_110_400_000,
  endMs: 1_794_110_460_000,
  source: { bundleId: 'com.apple.health', name: 'Health' },
  sourceRevision: { version: null, productType: 'Watch7,1', osVersion: '26.1.0' },
  device: { model: 'Watch', manufacturer: 'Apple' },
  userEntered: false,
};

test.each([
  { ...common, type: 'bodyMass', value: 75.2, unit: 'kg' },
  { ...common, type: 'hrv', value: 42.5, unit: 'ms' },
  { ...common, type: 'restingHeartRate', value: 58, unit: 'bpm' },
  { ...common, type: 'sleep', stage: 'asleepCore' },
  { ...common, type: 'workout', activityType: 50 },
])('accepts the provenance DTO for $type', (sample) => {
  expect(healthSampleDtoSchema.parse(sample)).toEqual(sample);
});

test.each([
  { type: 'bodyMass', unit: 'kg' },
  { type: 'hrv', unit: 'ms' },
  { type: 'restingHeartRate', unit: 'bpm' },
])('$type requires a finite positive value and its explicit unit', (quantity) => {
  for (const value of [-1, 0, NaN, Infinity, -Infinity]) {
    expect(healthSampleDtoSchema.safeParse({ ...common, ...quantity, value }).success).toBe(false);
  }
  for (const unit of [undefined, 'lb', 'kg', 'ms', 'bpm'].filter((unit) => unit !== quantity.unit)) {
    expect(healthSampleDtoSchema.safeParse({ ...common, ...quantity, value: 50, unit }).success).toBe(false);
  }
});

test('requires a UUID and an ordered integer interval', () => {
  const sample = { ...common, type: 'sleep', stage: 'asleepDeep' };
  for (const change of [
    { uuid: undefined },
    { uuid: 'not-a-uuid' },
    { startMs: 0.5 },
    { endMs: Infinity },
    { endMs: common.startMs - 1 },
  ]) {
    expect(healthSampleDtoSchema.safeParse({ ...sample, ...change }).success).toBe(false);
  }
  expect(healthSampleDtoSchema.safeParse({ ...sample, endMs: common.startMs }).success).toBe(true);
});

test('accepts an absent device without inventing device fields', () => {
  const sample = { ...common, type: 'bodyMass', value: 75, unit: 'kg', device: null, sourceRevision: {} };
  expect(healthSampleDtoSchema.parse(sample)).toEqual(sample);
});

test('requires a sleep stage from the HK-1 vocabulary', () => {
  expect(healthSampleDtoSchema.safeParse({ ...common, type: 'sleep' }).success).toBe(false);
  for (const stage of ['inBed', 'awake', 'asleepCore', 'asleepDeep', 'asleepREM', 'asleepUnspecified']) {
    expect(healthSampleDtoSchema.safeParse({ ...common, type: 'sleep', stage }).success).toBe(true);
  }
  expect(healthSampleDtoSchema.safeParse({ ...common, type: 'sleep', stage: 'unknown' }).success).toBe(false);
});

test('validates the native page envelope but leaves individual samples unvalidated', () => {
  const page = { samples: [null, { malformed: true }], deletedUuids: [common.uuid], anchor: 'opaque', hasMore: false };
  expect(healthKitPageSchema.parse(page)).toEqual(page);
  for (const change of [
    { samples: null },
    { deletedUuids: [42] },
    { anchor: '' },
    { hasMore: 'false' },
  ]) {
    expect(healthKitPageSchema.safeParse({ ...page, ...change }).success).toBe(false);
  }
});

test('deleted UUIDs reject malformed identifiers and accept upper- and lowercase HealthKit UUIDs', () => {
  const page = { samples: [], deletedUuids: [common.uuid, common.uuid.toLowerCase()], anchor: 'opaque', hasMore: false };
  expect(healthKitPageSchema.parse(page).deletedUuids).toEqual(page.deletedUuids);
  for (const uuid of ['', 'not-a-uuid', 'A7453A19-09DB-4F31-8D82-542B13D8BE8Z']) {
    expect(healthKitPageSchema.safeParse({ ...page, deletedUuids: [uuid] }).success).toBe(false);
  }
});
