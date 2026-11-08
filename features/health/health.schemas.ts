import { z } from 'zod';

const optionalText = z.string().nullish();
const common = {
  uuid: z.uuid(),
  startMs: z.number().int(),
  endMs: z.number().int(),
  source: z.object({ bundleId: z.string().min(1), name: z.string().min(1) }).strict(),
  sourceRevision: z.object({
    version: optionalText,
    productType: optionalText,
    /** Dotted operating-system version, e.g. 26.1.0. */
    osVersion: optionalText,
  }).strict(),
  device: z.object({
    model: optionalText,
    manufacturer: optionalText,
    hardwareVersion: optionalText,
    softwareVersion: optionalText,
    name: optionalText,
  }).strict().nullable(),
  userEntered: z.boolean(),
};

/** HK-1 native provenance; timestamps are Unix epoch milliseconds. */
export const healthSampleDtoSchema = z.discriminatedUnion('type', [
  z.object({ ...common, type: z.literal('bodyMass'), value: z.number().positive(), unit: z.literal('kg') }).strict(),
  z.object({ ...common, type: z.literal('hrv'), value: z.number().positive(), unit: z.literal('ms') }).strict(),
  z.object({ ...common, type: z.literal('restingHeartRate'), value: z.number().positive(), unit: z.literal('bpm') }).strict(),
  z.object({
    ...common,
    type: z.literal('sleep'),
    stage: z.enum(['inBed', 'awake', 'asleepCore', 'asleepDeep', 'asleepREM', 'asleepUnspecified']),
  }).strict(),
  z.object({
    ...common,
    type: z.literal('workout'),
    /** HKWorkoutActivityType.rawValue, not a localized name. */
    activityType: z.number().int().nonnegative(),
  }).strict(),
]).refine((sample) => sample.endMs >= sample.startMs, {
  message: 'Sample end must not precede its start',
  path: ['endMs'],
});

export type HealthSampleDto = z.infer<typeof healthSampleDtoSchema>;

/** Validate the bridge envelope here; sync validates and counts samples individually. */
export const healthKitPageSchema = z.object({
  samples: z.array(z.unknown()),
  deletedUuids: z.array(z.uuid()),
  anchor: z.string().min(1),
  hasMore: z.boolean(),
}).strict();

export type HealthKitPage = z.infer<typeof healthKitPageSchema>;

// PHR-1 storage boundary. Keep raw columns explicit; malformed rows stay on disk.
const signalTypeRow = z.enum(['bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout']);
const rowText = z.string().nullable();
const rowTime = z.number().int();
export const healthSampleRowSchema = z.object({
  id: z.uuid(), hk_uuid: z.uuid(), type: signalTypeRow,
  start_ms: rowTime, end_ms: rowTime, value: z.number().nullable(), unit: rowText,
  sleep_stage: rowText, activity_type: z.number().int().nonnegative().nullable(),
  source_bundle_id: z.string(), source_name: z.string(), source_version: rowText,
  source_product_type: rowText, source_os_version: rowText,
  device_present: z.union([z.literal(0), z.literal(1)]),
  device_model: rowText, device_manufacturer: rowText, device_hardware_version: rowText,
  device_software_version: rowText, device_name: rowText,
  user_entered: z.union([z.literal(0), z.literal(1)]),
}).strict().transform((row): { id: string; sample: unknown } => ({
  id: row.id,
  sample: {
    uuid: row.hk_uuid, type: row.type, startMs: row.start_ms, endMs: row.end_ms,
    source: { bundleId: row.source_bundle_id, name: row.source_name },
    sourceRevision: { version: row.source_version, productType: row.source_product_type, osVersion: row.source_os_version },
    device: row.device_present ? {
      model: row.device_model, manufacturer: row.device_manufacturer, hardwareVersion: row.device_hardware_version,
      softwareVersion: row.device_software_version, name: row.device_name,
    } : null,
    userEntered: row.user_entered === 1,
    ...(row.type === 'sleep' ? { stage: row.sleep_stage } : row.type === 'workout' ? { activityType: row.activity_type } : { value: row.value, unit: row.unit }),
  },
})).pipe(z.object({ id: z.uuid(), sample: healthSampleDtoSchema })).transform(({ id, sample }) => ({ ...sample, id }));

export const signalAvailabilityRowSchema = z.object({
  type: signalTypeRow, state: z.enum(['unavailableOnDevice', 'notRequested', 'requested']),
  read_state: z.enum(['hasSamples', 'noReadableSamples', 'queryError']).nullable(),
  last_query_at: rowTime.nullable(), last_sample_at: rowTime.nullable(),
}).strict().refine((row) => row.state === 'requested' || row.read_state === null).transform((row) => ({
  type: row.type, lastQueryAt: row.last_query_at, lastSampleAt: row.last_sample_at,
  ...(row.state === 'requested' ? { state: row.state, readState: row.read_state } : { state: row.state, readState: null }),
}));

export const healthSyncAnchorRowSchema = z.object({
  type: signalTypeRow, anchor: z.string().min(1).nullable(), backfill_start_ms: rowTime,
}).strict().transform((row) => ({ type: row.type, anchor: row.anchor, backfillStartMs: row.backfill_start_ms }));
