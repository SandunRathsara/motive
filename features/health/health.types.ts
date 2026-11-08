import type { HealthSampleDto } from './health.schemas';

/** Signal display order; not HealthKit's native type identifiers. */
export const healthSignalTypes = ['bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout'] as const;
export type HealthSignalType = typeof healthSignalTypes[number];

/** Cached normalized sample: id is a stable local ID, independent of the HealthKit UUID. */
export type HealthSample = HealthSampleDto & { id: string };

export type SignalAvailability = {
  type: HealthSignalType;
  lastQueryAt: number | null;
  lastSampleAt: number | null;
} & (
  | { state: 'unavailableOnDevice' | 'notRequested'; readState: null }
  | { state: 'requested'; readState: 'hasSamples' | 'noReadableSamples' | 'queryError' | null }
);

export type Coverage = { known: number; of: number; unit: 'days' | 'nights' };

export type UnknownReason =
  | 'noSamples'
  /** Today-scoped missing value under SIG-8, not a query failure. */
  | 'notYetAvailable'
  | 'insufficientCoverage'
  | 'unavailableOnDevice'
  | 'notRequested'
  | 'queryError';

/** One entry per contributing sample; sampleTime is its start in Unix epoch milliseconds. */
export type SignalProvenance = {
  source: { bundleId: string; name: string };
  userEntered: boolean;
  sampleId: string;
  sampleTime: number;
};

export type SignalValue<T> =
  | { known: true; value: T; provenance: SignalProvenance[]; coverage?: Coverage }
  | { known: false; reason: UnknownReason; coverage?: Coverage };

export type HealthSyncError =
  | { kind: 'unavailable' }
  | { kind: 'queryFailed'; type: HealthSignalType }
  | { kind: 'invalidStoredData'; type: HealthSignalType }
  | { kind: 'validationSkipped'; type: HealthSignalType; count: number };
export type HealthReadError = Error & { kind: 'readFailed' };

/** Aggregate-only transport boundary (AI-1): never contains provenance or stable IDs. */
export type HealthContextValue = (
  | { known: true; value: number }
  | { known: false; reason: UnknownReason }
) & { coverage: Coverage };
export type HealthContextComparison = { value: HealthContextValue; baseline: HealthContextValue };
export type HealthCoachingContext = {
  units: { weight: 'kg'; sleep: 'min'; hrv: 'ms'; restingHeartRate: 'bpm' };
  days: {
    day: string;
    weight: HealthContextValue;
    trendWeight: HealthContextValue;
    sleep: HealthContextValue;
    hrv: HealthContextComparison;
    restingHeartRate: HealthContextComparison;
  }[];
};
export type HealthEvidenceContext = {
  label: 'not used in the decision';
  asOf: number;
  units: HealthCoachingContext['units'];
} & Record<'sleep' | 'hrv' | 'restingHeartRate', { last7: HealthContextValue; baseline: HealthContextValue }>;

// ── Presentation view models ──────────────────────────────────────────────────
// Hooks format values, coverage, times and chart levels; components never derive health values.

export type SignalStatusViewModel =
  | 'unavailableOnDevice' | 'notRequested' | 'hasSamples' | 'noReadableSamples' | 'queryError';

export type SignalSourceViewModel = { name: string; userEntered: boolean };

export type SignalDisplayValue = (
  | { known: true; text: string; source?: SignalSourceViewModel; ageText?: string }
  | { known: false; copy: string }
) & { coverageText?: string };

export type SignalAggregateDisplayValue = SignalDisplayValue & { coverageText: string };

/** A pre-positioned chart point, not a health measurement. Unknown slots remain gaps. */
export type SignalSparklinePoint =
  | { known: true; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  | { known: false };

export type SignalRowViewModel = {
  type: HealthSignalType;
  title: string;
  value: SignalDisplayValue;
  trendWeight?: SignalAggregateDisplayValue;
  /** Fourteen slots, oldest first. */
  points: readonly SignalSparklinePoint[];
  baseline?: SignalAggregateDisplayValue;
  status: SignalStatusViewModel;
  statusText: string;
  lastSyncText: string;
};

export type HealthWorkoutViewModel = {
  id: string;
  activityName: string;
  timeText: string;
  durationText: string;
};

export type SignalSampleViewModel = {
  id: string;
  valueText: string;
  timeText: string;
  source: SignalSourceViewModel;
  notInBaseline?: boolean;
  notUsedThisNight?: boolean;
};

export type SignalSampleDayViewModel = {
  id: string;
  dayText: string;
  samples: readonly SignalSampleViewModel[];
};

export type TodayTrendLineViewModel = {
  type: 'sleep' | 'restingHeartRate' | 'hrv';
  text: string;
  /** Only supplied for an unusual source or a stale value (SIG-4). */
  sourceLabel?: string;
  staleAgeText?: string;
};

export type SignalsViewModel = {
  connectionState: 'unavailableOnDevice' | 'notRequested' | 'requested';
  signals: readonly SignalRowViewModel[];
  workouts: readonly HealthWorkoutViewModel[];
  lastSyncText: string;
};

export type SignalDetailViewModel = {
  type: HealthSignalType;
  title: string;
  value: SignalDisplayValue;
  status: SignalStatusViewModel;
  statusText: string;
  days: readonly SignalSampleDayViewModel[];
  lastSyncText: string;
  deleting?: boolean;
  deleteErrorText?: string;
};
// ── End presentation view models ──────────────────────────────────────────────
