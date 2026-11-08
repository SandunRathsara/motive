import type { Coverage, HealthCoachingContext, HealthContextValue, HealthEvidenceContext, HealthSample, SignalProvenance, SignalValue, UnknownReason } from './health.types';

/**
 * Pure SIG rules for already-validated samples. Durations are minutes; day ranges
 * are inclusive ISO dates under the fixed 04:00 DEVICE-local boundary.
 *
 * Source identity is bundleId. Thirty-day source windows include today and the
 * previous 29 local signal days. Count ties use latest sample, then bundleId.
 * HRV/RHR switches are replayed at sample timestamps and window expirations;
 * membership means eligible for the current source, not membership in a specific
 * 28-day comparison window. Late imports/deletions therefore recompute history.
 *
 * Asleep intervals define sleep blocks; awake/in-bed records never bridge long
 * gaps or add duration. Overlapping asleep minutes count once. Among equal
 * source classes the longest elapsed block wins, then latest wake, then ID.
 * In-bed-only nights rank with iPhone (even if their model says Watch), ahead
 * of user-entered nights, but produce unknown/noSamples, never a zero duration.
 */
const DAY = 86_400_000;
const HOUR = 3_600_000;

export type SignalRulesContext = {
  now: number;
  /** Minutes east of UTC at this instant. Defaults to the device's local zone. */
  utcOffsetMinutes?: (instant: number) => number;
};
export type SignalDayRange = { startDay: string; endDay: string };
export type CoveredSignalValue = SignalValue<number> & { coverage: Coverage };
export type DailySignalValue = CoveredSignalValue & { day: string };
export type SignalSeries = { days: DailySignalValue[]; coverage: Coverage };
export type SignalSource = SignalProvenance['source'];
export type LatestWeight =
  /** ageDays is completed elapsed 24-hour periods; stale is strictly > 7 × 24 h. */
  | (Extract<CoveredSignalValue, { known: true }> & { ageDays: number; stale: boolean })
  | Extract<CoveredSignalValue, { known: false }>;
export type WeightSignal = {
  today: CoveredSignalValue;
  latest: LatestWeight;
  trendWeight: CoveredSignalValue;
  series: SignalSeries;
  usualSource: SignalSource | null;
};
export type SleepSourceClass = 'appleWatch' | 'other' | 'iPhoneOrInBedOnly' | 'userEntered';
export type SleepNight = {
  day: string;
  duration: CoveredSignalValue; // Minutes asleep, not the block's elapsed duration.
  chosenSource: SignalSource;
  sourceClass: SleepSourceClass;
  selectedSampleIds: string[];
  excluded: { source: SignalSource; sampleIds: string[]; reason: 'notUsedThisNight' }[];
};
export type SignalComparison = { baseline: CoveredSignalValue; last7: CoveredSignalValue };
export type SleepSignal = SignalComparison & { today: CoveredSignalValue; series: SignalSeries; nights: SleepNight[]; usualSource: SignalSource | null };
export type BaselineMembership = {
  sampleId: string;
  inBaseline: boolean;
  reason: 'userEntered' | 'otherSource' | 'beforeSourceSwitch' | null;
};
export type MeasuredSignal = SignalComparison & {
  today: CoveredSignalValue;
  series: SignalSeries;
  baselineSource: SignalSource | null;
  usualSource: SignalSource | null;
  baselineSince: number | null;
  samples: BaselineMembership[];
};
export type SignalTrendLine = {
  signal: 'sleep' | 'restingHeartRate' | 'hrv';
  /** Positive magnitude: minutes below, bpm above, or percent below the baseline. */
  delta: number;
  deltaUnit: 'minutes' | 'bpm' | 'percent';
  coverage: Coverage;
  baseline: Extract<CoveredSignalValue, { known: true }>;
  last7: Extract<CoveredSignalValue, { known: true }>;
};
export type DerivedHealthSignals = {
  bodyMass: WeightSignal;
  sleep: SleepSignal;
  hrv: MeasuredSignal;
  restingHeartRate: MeasuredSignal;
  trendLine: SignalTrendLine | null;
};
type SleepSample = HealthSample & { type: 'sleep' };
type MeasuredSample = HealthSample & { type: 'hrv' | 'restingHeartRate' };

/** Shift wall-clock hours, not elapsed hours: DST must not move the 04:00 boundary. */
export function healthDayKey(instant: number, context: SignalRulesContext): string {
  const offset = context.utcOffsetMinutes?.(instant) ?? -new Date(instant).getTimezoneOffset();
  return new Date(instant + offset * 60_000 - 4 * HOUR).toISOString().slice(0, 10);
}

function shiftDay(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY).toISOString().slice(0, 10);
}

function dayStart(day: string, context: SignalRulesContext): number {
  const wallTime = Date.parse(`${day}T04:00:00Z`);
  let instant = wallTime;
  for (let i = 0; i < 3; i++) {
    const offset = context.utcOffsetMinutes?.(instant) ?? -new Date(instant).getTimezoneOffset();
    instant = wallTime - offset * 60_000;
  }
  return instant;
}

function dayKeys(range: SignalDayRange): string[] {
  const days: string[] = [];
  for (let day = range.startDay; day <= range.endDay; day = shiftDay(day, 1)) days.push(day);
  return days;
}

function provenance(sample: HealthSample): SignalProvenance {
  return { source: sample.source, userEntered: sample.userEntered, sampleId: sample.id, sampleTime: sample.startMs };
}

function missing(reason: UnknownReason, unit: Coverage['unit'] = 'days', of = 1): Extract<CoveredSignalValue, { known: false }> {
  return { known: false, reason, coverage: { known: 0, of, unit } };
}

function known(value: number, samples: HealthSample[], unit: Coverage['unit'] = 'days'): Extract<CoveredSignalValue, { known: true }> {
  return { known: true, value, provenance: samples.map(provenance), coverage: { known: 1, of: 1, unit } };
}

function series(days: DailySignalValue[], unit: Coverage['unit'] = 'days'): SignalSeries {
  return { days, coverage: { known: days.filter((day) => day.known).length, of: days.length, unit } };
}

function aggregate(input: SignalSeries, operation: 'mean' | 'median' = 'mean', minimum = 1): CoveredSignalValue {
  const values = input.days.filter((day) => day.known);
  if (values.length < minimum) {
    return { known: false, reason: minimum > 1 ? 'insufficientCoverage' : 'noSamples', coverage: input.coverage };
  }
  const numbers = values.map((day) => day.value).sort((a, b) => a - b);
  const middle = Math.floor(numbers.length / 2);
  const value = operation === 'mean'
    ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length
    : numbers.length % 2 ? numbers[middle] : (numbers[middle - 1] + numbers[middle]) / 2;
  return { known: true, value, provenance: values.flatMap((day) => day.provenance), coverage: input.coverage };
}

function earliestWeightsByDay(samples: readonly HealthSample[], context: SignalRulesContext): Map<string, HealthSample & { type: 'bodyMass' }> {
  const earliest = new Map<string, HealthSample & { type: 'bodyMass' }>();
  for (const sample of samples) {
    if (sample.type !== 'bodyMass' || sample.startMs > context.now) continue;
    const day = healthDayKey(sample.startMs, context);
    const previous = earliest.get(day);
    if (!previous || sample.startMs < previous.startMs || (sample.startMs === previous.startMs && sample.id < previous.id)) {
      earliest.set(day, sample);
    }
  }
  return earliest;
}

/** Inclusive local signal-day range; provenance contains the selected stable local sample ID. */
export function dailyWeights(samples: readonly HealthSample[], range: SignalDayRange, context: SignalRulesContext): SignalSeries {
  const earliest = earliestWeightsByDay(samples, context);
  return series(dayKeys(range).map((day) => {
    const sample = earliest.get(day);
    return { day, ...(sample ? known(sample.value, [sample]) : missing('noSamples')) };
  }));
}

export function trendWeight(samples: readonly HealthSample[], day: string, context: SignalRulesContext): CoveredSignalValue {
  return aggregate(dailyWeights(samples, { startDay: shiftDay(day, -6), endDay: day }, context));
}

/** The last weigh-in contributes through day +6; retained history has no expiry. */
export function latestKnownTrendWeight(samples: readonly HealthSample[], context: SignalRulesContext): CoveredSignalValue {
  const latestDay = [...earliestWeightsByDay(samples, context).keys()].sort().pop();
  const today = healthDayKey(context.now, context);
  const lastKnownDay = latestDay ? shiftDay(latestDay, 6) : today;
  return trendWeight(samples, lastKnownDay < today ? lastKnownDay : today, context);
}

function sleepClass(sample: SleepSample, inBedOnly: boolean): SleepSourceClass {
  if (sample.userEntered) return 'userEntered';
  if (inBedOnly) return 'iPhoneOrInBedOnly';
  const model = sample.device?.model?.toLowerCase();
  if (model === 'watch') return 'appleWatch';
  if (model === 'iphone') return 'iPhoneOrInBedOnly';
  return 'other';
}

function sleepNights(samples: readonly HealthSample[], context: SignalRulesContext): SleepNight[] {
  const sources = new Map<string, SleepSample[]>();
  for (const sample of samples) {
    if (sample.type !== 'sleep' || sample.endMs > context.now) continue;
    const key = `${sample.source.bundleId}:${sample.userEntered}`;
    sources.set(key, [...(sources.get(key) ?? []), sample]);
  }
  type Block = { start: number; end: number; asleep: SleepSample[]; samples: SleepSample[]; sourceClass: SleepSourceClass };
  const byDay = new Map<string, Block[]>();
  for (const sourceSamples of sources.values()) {
    const asleep = sourceSamples.filter((sample) => sample.stage.startsWith('asleep') && sample.endMs > sample.startMs);
    const fallback = sourceSamples.filter((sample) => !sample.stage.startsWith('asleep') && !asleep.some((stage) => sample.startMs <= stage.endMs && sample.endMs >= stage.startMs));
    const blocks: Block[] = [];
    for (const intervals of [asleep, fallback]) {
      let previous: Block | undefined;
      for (const sample of intervals.sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id))) {
        if (previous && sample.startMs - previous.end < HOUR) {
          previous.end = Math.max(previous.end, sample.endMs);
          if (sample.stage.startsWith('asleep')) previous.asleep.push(sample);
        } else {
          previous = { start: sample.startMs, end: sample.endMs, asleep: sample.stage.startsWith('asleep') ? [sample] : [], samples: [], sourceClass: 'other' };
          blocks.push(previous);
        }
      }
    }
    for (const block of blocks) {
      block.samples = sourceSamples.filter((sample) => sample.startMs <= block.end && sample.endMs >= block.start);
      block.sourceClass = sleepClass(block.asleep[0] ?? block.samples[0], block.asleep.length === 0);
      const day = healthDayKey(block.end, context);
      byDay.set(day, [...(byDay.get(day) ?? []), block]);
    }
  }
  const rank: Record<SleepSourceClass, number> = { appleWatch: 0, other: 1, iPhoneOrInBedOnly: 2, userEntered: 3 };
  return [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, blocks]) => {
    blocks.sort((a, b) => rank[a.sourceClass] - rank[b.sourceClass] || (b.end - b.start) - (a.end - a.start) || b.end - a.end || a.samples[0].id.localeCompare(b.samples[0].id));
    const chosen = blocks[0];
    const excluded = new Map<string, { source: SignalSource; sampleIds: string[]; reason: 'notUsedThisNight' }>();
    const selected = new Set(chosen.samples.map((sample) => sample.id));
    for (const block of blocks.slice(1)) {
      for (const sample of block.samples) {
        if (selected.has(sample.id)) continue;
        const entry = excluded.get(sample.source.bundleId) ?? { source: sample.source, sampleIds: [], reason: 'notUsedThisNight' as const };
        if (!entry.sampleIds.includes(sample.id)) entry.sampleIds.push(sample.id);
        excluded.set(sample.source.bundleId, entry);
      }
    }
    let countedUntil = -Infinity;
    const duration = chosen.asleep.reduce((sum, sample) => {
      const additional = Math.max(0, sample.endMs - Math.max(sample.startMs, countedUntil));
      countedUntil = Math.max(countedUntil, sample.endMs);
      return sum + additional;
    }, 0) / 60_000;
    return {
      day, chosenSource: chosen.samples[0].source, sourceClass: chosen.sourceClass,
      duration: duration > 0 ? known(duration, chosen.asleep, 'nights') : missing('noSamples', 'nights'),
      selectedSampleIds: [...selected], excluded: [...excluded.values()],
    };
  });
}

function mostFrequentSource(samples: readonly HealthSample[]): SignalSource | null {
  const groups = new Map<string, { count: number; latest: HealthSample }>();
  for (const sample of samples) {
    const previous = groups.get(sample.source.bundleId);
    groups.set(sample.source.bundleId, {
      count: (previous?.count ?? 0) + 1,
      latest: !previous || sample.startMs > previous.latest.startMs ? sample : previous.latest,
    });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.latest.startMs - a.latest.startMs || a.latest.source.bundleId.localeCompare(b.latest.source.bundleId))[0]?.latest.source ?? null;
}

/**
 * Reconstruct source changes from sample times; no persisted derived state is needed.
 * ponytail: replay scans cached samples per event; use a rolling counter if real
 * sample volumes make this bounded foreground-history calculation too slow.
 */
function baselineSelection(device: MeasuredSample[], context: SignalRulesContext): { source: SignalSource | null; since: number | null } {
  const selection: { source: SignalSource | null; since: number | null } = { source: null, since: null };
  const events = [...new Set(device.flatMap((sample) => [
    sample.startMs, dayStart(shiftDay(healthDayKey(sample.startMs, context), 30), context),
  ]))].filter((at) => at <= context.now).sort((a, b) => a - b);
  for (const at of events) {
    const startDay = shiftDay(healthDayKey(at, context), -29);
    const source = mostFrequentSource(device.filter((sample) => sample.startMs <= at && healthDayKey(sample.startMs, context) >= startDay));
    if (source?.bundleId !== selection.source?.bundleId) selection.since = source ? at : null;
    selection.source = source;
  }
  return selection;
}

function measuredSignal(samples: readonly HealthSample[], type: MeasuredSample['type'], context: SignalRulesContext): MeasuredSignal {
  const today = healthDayKey(context.now, context);
  const all = samples.filter((sample): sample is MeasuredSample => sample.type === type && sample.startMs <= context.now)
    .sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
  const device = all.filter((sample) => !sample.userEntered);
  const { source: baselineSource, since: baselineSince } = baselineSelection(device, context);
  const membership: BaselineMembership[] = all.map((sample) => {
    const reason = sample.userEntered ? 'userEntered'
      : sample.source.bundleId !== baselineSource?.bundleId ? 'otherSource'
        : baselineSince !== null && sample.startMs < baselineSince ? 'beforeSourceSwitch' : null;
    return { sampleId: sample.id, inBaseline: reason === null, reason };
  });
  const included = new Set(membership.filter((sample) => sample.inBaseline).map((sample) => sample.sampleId));
  const days = dayKeys({ startDay: shiftDay(today, -34), endDay: today }).map((day) => {
    const daily = all.filter((sample) => included.has(sample.id) && healthDayKey(sample.startMs, context) === day);
    return {
      day, ...(daily.length ? known(daily.reduce((sum, sample) => sum + sample.value, 0) / daily.length, daily) : missing(day === today ? 'notYetAvailable' : 'noSamples')),
    };
  });
  return {
    today: days[days.length - 1], series: series(days.slice(-14)),
    baseline: aggregate(series(days.slice(0, 28)), 'median', 14),
    last7: aggregate(series(days.slice(-7))),
    baselineSource, usualSource: baselineSource, baselineSince, samples: membership,
  };
}

function selectTrendLine(signals: Record<SignalTrendLine['signal'], SignalComparison>): SignalTrendLine | null {
  for (const signal of ['sleep', 'restingHeartRate', 'hrv'] as const) {
    const { baseline, last7 } = signals[signal];
    if (!baseline.known || !last7.known || last7.coverage.known < 4) continue;
    const qualifies = signal === 'sleep' ? last7.value <= baseline.value - 30
      : signal === 'restingHeartRate' ? last7.value >= baseline.value + 3 : last7.value <= baseline.value * 0.9;
    if (!qualifies) continue;
    const delta = signal === 'restingHeartRate' ? last7.value - baseline.value
      : signal === 'sleep' ? baseline.value - last7.value : (baseline.value - last7.value) / baseline.value * 100;
    return { signal, delta, deltaUnit: signal === 'sleep' ? 'minutes' : signal === 'hrv' ? 'percent' : 'bpm', coverage: last7.coverage, baseline, last7 };
  }
  return null;
}

export function deriveHealthSignals(samples: readonly HealthSample[], context: SignalRulesContext): DerivedHealthSignals {
  const today = healthDayKey(context.now, context);
  const weights = dailyWeights(samples, { startDay: shiftDay(today, -13), endDay: today }, context);
  const latest = [...earliestWeightsByDay(samples, context)].sort(([a], [b]) => b.localeCompare(a))[0]?.[1];
  const nights = sleepNights(samples, context);
  const nightValues = new Map(nights.map((night) => [night.day, night.duration]));
  const sleepToday = nightValues.get(today) ?? missing('notYetAvailable', 'nights');
  const sleepDays = dayKeys({ startDay: shiftDay(today, -34), endDay: today }).map((day) => ({
    day, ...(nightValues.get(day) ?? missing(day === today ? 'notYetAvailable' : 'noSamples', 'nights')),
  }));
  const sleep: SleepSignal = {
    today: sleepToday, series: series(sleepDays.slice(-14), 'nights'), nights,
    baseline: aggregate(series(sleepDays.slice(0, 28), 'nights'), 'median', 14),
    last7: aggregate(series(sleepDays.slice(-7), 'nights')),
    usualSource: mostFrequentSource(samples.filter((sample) => sample.type === 'sleep' && sample.endMs <= context.now && healthDayKey(sample.startMs, context) >= shiftDay(today, -29))),
  };
  const hrv = measuredSignal(samples, 'hrv', context);
  const restingHeartRate = measuredSignal(samples, 'restingHeartRate', context);
  return {
    bodyMass: {
      today: weights.days[weights.days.length - 1],
      latest: latest ? {
        ...known(latest.value, [latest]),
        ageDays: Math.floor((context.now - latest.startMs) / DAY),
        stale: context.now - latest.startMs > 7 * DAY,
      } : missing('noSamples'),
      trendWeight: trendWeight(samples, today, context),
      series: weights,
      usualSource: mostFrequentSource(samples.filter((sample) => sample.type === 'bodyMass' && sample.startMs <= context.now && healthDayKey(sample.startMs, context) >= shiftDay(today, -29))),
    },
    sleep, hrv, restingHeartRate,
    trendLine: selectTrendLine({ sleep, hrv, restingHeartRate }),
  };
}

/** Pass latest.stale for weight; unknown values never display a source or age. */
export function provenanceDisplay(value: CoveredSignalValue, usualSource: SignalSource | null, stale = false): { showSource: boolean; showAge: boolean } {
  return {
    showSource: value.known && value.provenance.some((sample) => sample.source.bundleId !== usualSource?.bundleId),
    showAge: value.known && stale,
  };
}

function contextValue(value: CoveredSignalValue): HealthContextValue {
  return value.known ? { known: true, value: value.value, coverage: value.coverage }
    : { known: false, reason: value.reason, coverage: value.coverage };
}

/** Historical values are as-of each day's close, not a carry-forward from today. */
export function coachingHealthAggregates(samples: readonly HealthSample[], context: SignalRulesContext): HealthCoachingContext {
  const today = healthDayKey(context.now, context);
  return {
    units: { weight: 'kg', sleep: 'min', hrv: 'ms', restingHeartRate: 'bpm' },
    days: dayKeys({ startDay: shiftDay(today, -27), endDay: today }).map((day) => {
      const dayContext = { ...context, now: Math.min(context.now, dayStart(shiftDay(day, 1), context) - 1) };
      const derived = deriveHealthSignals(samples, dayContext);
      return { day, weight: contextValue(derived.bodyMass.today), trendWeight: contextValue(derived.bodyMass.trendWeight),
        sleep: contextValue(derived.sleep.today),
        hrv: { value: contextValue(derived.hrv.today), baseline: contextValue(derived.hrv.baseline) },
        restingHeartRate: { value: contextValue(derived.restingHeartRate.today), baseline: contextValue(derived.restingHeartRate.baseline) },
      };
    }),
  };
}

export function evidenceHealthAggregates(samples: readonly HealthSample[], context: SignalRulesContext): HealthEvidenceContext {
  const derived = deriveHealthSignals(samples, context);
  return { label: 'not used in the decision', asOf: context.now,
    units: { weight: 'kg', sleep: 'min', hrv: 'ms', restingHeartRate: 'bpm' },
    sleep: { last7: contextValue(derived.sleep.last7), baseline: contextValue(derived.sleep.baseline) },
    hrv: { last7: contextValue(derived.hrv.last7), baseline: contextValue(derived.hrv.baseline) },
    restingHeartRate: { last7: contextValue(derived.restingHeartRate.last7), baseline: contextValue(derived.restingHeartRate.baseline) },
  };
}
