import type { HealthSample } from './health.types';
import { dailyWeights, deriveHealthSignals, healthDayKey, provenanceDisplay, trendWeight } from './health.utils';

const ms = (iso: string) => Date.parse(iso);
const context = { now: ms('2026-11-08T12:00:00Z'), utcOffsetMinutes: () => 0 };
const source = { bundleId: 'watch', name: 'My Watch' };
const common = (id: string, start: string) => ({
  id, uuid: id, startMs: ms(start), endMs: ms(start), source,
  sourceRevision: {}, device: { model: 'Watch' }, userEntered: false,
});
const weight = (id: string, at: string, value: number): HealthSample => ({
  ...common(id, at), type: 'bodyMass', value, unit: 'kg',
});
type SleepSample = HealthSample & { type: 'sleep' };
const sleep = (id: string, start: string, end: string, stage: SleepSample['stage'] = 'asleepCore', model: string | null = 'Watch'): SleepSample => ({
  ...common(id, start), endMs: ms(end), type: 'sleep', stage,
  source: model === 'iPhone' ? { bundleId: 'phone', name: 'My iPhone' } : source,
  device: model ? { model } : null,
});
const measured = (id: string, at: string, value: number, type: 'hrv' | 'restingHeartRate' = 'hrv'): HealthSample => type === 'hrv'
  ? { ...common(id, at), type, value, unit: 'ms' }
  : { ...common(id, at), type, value, unit: 'bpm' };

test('Trend Weight averages day weights in the seven days ending the requested day, never raw weigh-ins', () => {
  const samples = [
    weight('old', '2026-11-01T06:00:00Z', 90),
    weight('a', '2026-11-02T06:00:00Z', 80),
    weight('a2', '2026-11-02T08:00:00Z', 99),
    weight('b', '2026-11-05T06:00:00Z', 82),
    weight('c', '2026-11-08T06:00:00Z', 84),
  ];
  expect(trendWeight(samples, '2026-11-08', context)).toMatchObject({
    known: true, value: 82, coverage: { known: 3, of: 7, unit: 'days' },
    provenance: [{ sampleId: 'a' }, { sampleId: 'b' }, { sampleId: 'c' }],
  });
  expect(trendWeight(samples, '2026-11-04', context)).toMatchObject({
    known: true, value: 85, coverage: { known: 2, of: 7, unit: 'days' },
  });
  expect(trendWeight([], '2026-11-08', context)).toEqual({
    known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' },
  });
});

test('injected wall-clock offsets keep 04:00 fixed over a DST spring-forward transition', () => {
  const dst = {
    now: ms('2026-03-08T12:00:00Z'),
    utcOffsetMinutes: (at: number) => at < ms('2026-03-08T07:00:00Z') ? -300 : -240,
  };
  expect(healthDayKey(ms('2026-03-08T07:30:00Z'), dst)).toBe('2026-03-07'); // 03:30 local
  expect(healthDayKey(ms('2026-03-08T08:00:00Z'), dst)).toBe('2026-03-08'); // 04:00 local
  expect(healthDayKey(ms('2026-11-08T22:29:00Z'), { ...context, utcOffsetMinutes: () => 330 })).toBe('2026-11-08');
  expect(healthDayKey(ms('2026-11-08T22:30:00Z'), { ...context, utcOffsetMinutes: () => 330 })).toBe('2026-11-09');
});

test('latest weight retains its actual sample age after it ages out of Trend Weight', () => {
  const old = weight('old', '2026-10-31T12:00:00Z', 79);
  expect(deriveHealthSignals([old], context).bodyMass).toMatchObject({
    today: { known: false, reason: 'noSamples' },
    latest: {
      known: true, value: 79, ageDays: 8, stale: true,
      coverage: { known: 1, of: 1, unit: 'days' }, provenance: [{ sampleId: 'old' }],
    },
    trendWeight: { known: false, reason: 'noSamples', coverage: { known: 0, of: 7, unit: 'days' } },
    series: { coverage: { known: 1, of: 14, unit: 'days' } },
  });
  expect(deriveHealthSignals([weight('exact', '2026-11-01T12:00:00Z', 80)], context).bodyMass.latest)
    .toMatchObject({ known: true, ageDays: 7, stale: false });
  expect(deriveHealthSignals([], context).bodyMass.latest).toEqual({
    known: false, reason: 'noSamples', coverage: { known: 0, of: 1, unit: 'days' },
  });
});

test('latest weight means the latest reading, not the selected day weight, and ignores future readings', () => {
  const result = deriveHealthSignals([
    weight('early', '2026-11-08T05:00:00Z', 80),
    weight('late', '2026-11-08T11:00:00Z', 82),
    weight('future', '2026-11-08T13:00:00Z', 99),
  ], context).bodyMass;
  expect(result.today).toMatchObject({ known: true, value: 80 });
  expect(result.latest).toMatchObject({ known: true, value: 82, ageDays: 0, stale: false, provenance: [{ sampleId: 'late' }] });
  expect(deriveHealthSignals([weight('justStale', '2026-11-01T11:59:59Z', 80)], context).bodyMass.latest)
    .toMatchObject({ known: true, ageDays: 7, stale: true });
});

test('the last-seven mean gives equal weight to known days, not to every sample', () => {
  const result = deriveHealthSignals([
    measured('first', '2026-11-07T06:00:00Z', 20),
    measured('second', '2026-11-07T07:00:00Z', 40),
    measured('third', '2026-11-08T07:00:00Z', 50),
  ], context).hrv;
  expect(result.last7).toMatchObject({ known: true, value: 40, coverage: { known: 2, of: 7, unit: 'days' } });
});

test('all four numeric signals expose fourteen gaps with coverage rather than zeros when no data exists', () => {
  const result = deriveHealthSignals([], context);
  for (const type of ['bodyMass', 'sleep', 'hrv', 'restingHeartRate'] as const) {
    const unit = type === 'sleep' ? 'nights' : 'days';
    expect(result[type].series.coverage).toEqual({ known: 0, of: 14, unit });
    expect(result[type].series.days).toHaveLength(14);
    expect(result[type].series.days[0]).toEqual({ day: '2026-10-26', known: false, reason: 'noSamples', coverage: { known: 0, of: 1, unit } });
    expect(result[type].series.days[13]).toEqual({ day: '2026-11-08', known: false, reason: type === 'bodyMass' ? 'noSamples' : 'notYetAvailable', coverage: { known: 0, of: 1, unit } });
  }
});
test.each(['hrv', 'restingHeartRate'] as const)('%s daily values average only device samples from the baseline source', (type) => {
  const result = deriveHealthSignals([
    measured('one', '2026-11-08T06:00:00Z', 30, type),
    measured('two', '2026-11-08T07:00:00Z', 50, type),
    { ...measured('manual', '2026-11-08T07:30:00Z', 1000, type), userEntered: true },
    { ...measured('other', '2026-11-08T08:00:00Z', 900, type), source: { bundleId: 'other', name: 'Other' } },
  ], context)[type];
  expect(result.today).toMatchObject({ known: true, value: 40, coverage: { known: 1, of: 1, unit: 'days' }, provenance: [{ sampleId: 'one' }, { sampleId: 'two' }] });
  expect(result.baselineSource).toEqual(source);
  expect(result.samples).toEqual([
    { sampleId: 'one', inBaseline: true, reason: null },
    { sampleId: 'two', inBaseline: true, reason: null },
    { sampleId: 'manual', inBaseline: false, reason: 'userEntered' },
    { sampleId: 'other', inBaseline: false, reason: 'otherSource' },
  ]);
});

test('a baseline source tie goes to the most recent sample and restarts values at the switch', () => {
  const other = { bundleId: 'new', name: 'New device' };
  const result = deriveHealthSignals([
    measured('a1', '2026-10-10T06:00:00Z', 90),
    measured('a2', '2026-10-11T06:00:00Z', 90),
    { ...measured('old-b', '2026-10-20T06:00:00Z', 20), source: other },
    { ...measured('switch', '2026-11-07T06:00:00Z', 40), source: other },
    { ...measured('new-b', '2026-11-08T06:00:00Z', 60), source: other },
  ], context).hrv;
  expect(result.baselineSource).toEqual(other);
  expect(result.baselineSince).toBe(ms('2026-11-07T06:00:00Z'));
  expect(result.today).toMatchObject({ known: true, value: 60 });
  expect(result.series.coverage).toEqual({ known: 2, of: 14, unit: 'days' });
  expect(result.samples).toEqual([
    { sampleId: 'a1', inBaseline: false, reason: 'otherSource' },
    { sampleId: 'a2', inBaseline: false, reason: 'otherSource' },
    { sampleId: 'old-b', inBaseline: false, reason: 'beforeSourceSwitch' },
    { sampleId: 'switch', inBaseline: true, reason: null },
    { sampleId: 'new-b', inBaseline: true, reason: null },
  ]);
});

test('baseline source selection also changes when old samples leave the 30-local-day window', () => {
  const other = { bundleId: 'remaining', name: 'Remaining device' };
  const result = deriveHealthSignals([
    measured('old-a1', '2026-10-09T06:00:00Z', 80),
    measured('old-a2', '2026-10-09T07:00:00Z', 80),
    { ...measured('remaining-b', '2026-10-11T06:00:00Z', 40), source: other },
  ], context).hrv;
  expect(result.baselineSource).toEqual(other);
  expect(result.baselineSince).toBe(ms('2026-11-08T04:00:00Z'));
  expect(result.samples[2]).toEqual({ sampleId: 'remaining-b', inBaseline: false, reason: 'beforeSourceSwitch' });
  expect(deriveHealthSignals([measured('expired', '2026-10-01T06:00:00Z', 80)], context).hrv.baselineSource).toBeNull();
});

test('today is not yet available before measured samples arrive, never carried from yesterday or filled from future samples', () => {
  const result = deriveHealthSignals([
    sleep('yesterday', '2026-11-06T23:00:00Z', '2026-11-07T07:00:00Z'),
    measured('yesterdayHrv', '2026-11-07T07:00:00Z', 50),
    measured('yesterdayRhr', '2026-11-07T07:00:00Z', 60, 'restingHeartRate'),
    { ...measured('manualToday', '2026-11-08T07:00:00Z', 100), userEntered: true },
    measured('future', '2026-11-08T13:00:00Z', 100),
    sleep('futureNight', '2026-11-08T00:00:00Z', '2026-11-08T13:00:00Z'),
  ], context);
  for (const signal of [result.sleep, result.hrv, result.restingHeartRate]) {
    expect(signal.today).toMatchObject({ known: false, reason: 'notYetAvailable', coverage: { known: 0, of: 1 } });
    expect(signal.series.days).toHaveLength(14);
    expect(signal.series.coverage).toMatchObject({ known: 1, of: 14 });
  }
  expect(result.hrv.samples).toContainEqual({ sampleId: 'manualToday', inBaseline: false, reason: 'userEntered' });
});

test('Signal Baseline needs fourteen of the previous twenty-eight days and uses their median', () => {
  const baseline = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130].map((value, index) =>
    measured(`baseline-${index}`, `2026-10-${String(index + 5).padStart(2, '0')}T07:00:00Z`, value));
  expect(deriveHealthSignals(baseline, context).hrv.baseline).toEqual({
    known: false, reason: 'insufficientCoverage', coverage: { known: 13, of: 28, unit: 'days' },
  });
  const result = deriveHealthSignals([
    ...baseline, measured('fourteenth', '2026-10-18T07:00:00Z', 1000),
    measured('recent1', '2026-11-02T07:00:00Z', 40),
    measured('recent2', '2026-11-08T07:00:00Z', 60),
  ], context).hrv;
  expect(result.baseline).toMatchObject({ known: true, value: 75, coverage: { known: 14, of: 28, unit: 'days' } });
  expect(result.last7).toMatchObject({ known: true, value: 50, coverage: { known: 2, of: 7, unit: 'days' }, provenance: [{ sampleId: 'recent1' }, { sampleId: 'recent2' }] });
});

function comparisonSamples(type: 'sleep' | 'hrv' | 'restingHeartRate', baselineValue: number, recentValue: number, recentCount = 4): HealthSample[] {
  const dates = [
    ...Array.from({ length: 14 }, (_, index) => ({ end: Date.UTC(2026, 9, index + 5, 7), value: baselineValue })),
    ...Array.from({ length: recentCount }, (_, index) => ({ end: Date.UTC(2026, 10, index + 5, 7), value: recentValue })),
  ];
  return dates.map(({ end, value }, index) => type === 'sleep'
    ? sleep(`${type}-${index}`, new Date(end - value * 60_000).toISOString(), new Date(end).toISOString())
    : measured(`${type}-${index}`, new Date(end).toISOString(), value, type));
}

test.each([
  ['sleep', 480, 450, 30, 'minutes'],
  ['sleep', 480, 450.01, null, 'minutes'],
  ['restingHeartRate', 60, 63, 3, 'bpm'],
  ['restingHeartRate', 60, 62.99, null, 'bpm'],
  ['hrv', 50, 45, 10, 'percent'],
  ['hrv', 50, 45.01, null, 'percent'],
] as const)('trend threshold for %s, baseline %s and last-seven mean %s', (type, baseline, last7, delta, deltaUnit) => {
  const result = deriveHealthSignals(comparisonSamples(type, baseline, last7), context);
  if (delta === null) expect(result.trendLine).toBeNull();
  else expect(result.trendLine).toMatchObject({
    signal: type, delta, deltaUnit, coverage: { known: 4, of: 7, unit: type === 'sleep' ? 'nights' : 'days' },
    baseline: { known: true, value: baseline, coverage: { known: 14, of: 28 } },
    last7: { known: true, value: last7, coverage: { known: 4, of: 7 } },
  });
});

test.each(['sleep', 'restingHeartRate', 'hrv'] as const)('a severe %s deviation from one or three days never makes a trend line', (type) => {
  for (const count of [1, 3]) {
    const samples = comparisonSamples(type, type === 'sleep' ? 480 : 60, type === 'restingHeartRate' ? 100 : 20, count);
    expect(deriveHealthSignals(samples, context).trendLine).toBeNull();
  }
});

test('at most one trend line is selected, in sleep then resting-HR then HRV order', () => {
  const sleepSamples = comparisonSamples('sleep', 480, 450);
  const rhrSamples = comparisonSamples('restingHeartRate', 60, 63);
  const hrvSamples = comparisonSamples('hrv', 50, 45);
  expect(deriveHealthSignals([...hrvSamples, ...rhrSamples, ...sleepSamples], context).trendLine?.signal).toBe('sleep');
  expect(deriveHealthSignals([...hrvSamples, ...rhrSamples], context).trendLine?.signal).toBe('restingHeartRate');
  expect(deriveHealthSignals(hrvSamples, context).trendLine?.signal).toBe('hrv');
  expect(deriveHealthSignals(sleepSamples.slice(1), context).trendLine).toBeNull(); // only 13 baseline nights
  expect(deriveHealthSignals([], context).trendLine).toBeNull();
});

test('usual weight/sleep sources count samples in thirty days; display labels only unusual sources or stale ages', () => {
  const scale = { bundleId: 'scale', name: 'Scale' };
  const bed = { bundleId: 'bed', name: 'Bed sensor' };
  const result = deriveHealthSignals([
    ...['a', 'b', 'c'].map((id) => weight(id, '2026-10-09T06:00:00Z', 79)),
    { ...weight('scale1', '2026-11-06T06:00:00Z', 80), source: scale, userEntered: true },
    { ...weight('scale2', '2026-11-07T06:00:00Z', 82), source: scale },
    weight('unusualToday', '2026-11-08T06:00:00Z', 81),
    sleep('watchNight', '2026-11-07T23:00:00Z', '2026-11-08T07:00:00Z'),
    ...['one', 'two'].map((id) => ({ ...sleep(id, '2026-11-07T23:00:00Z', '2026-11-08T07:00:00Z'), source: bed, device: { model: 'Bed sensor' } })),
    measured('hrv', '2026-11-08T07:00:00Z', 50),
  ], context);
  expect(result.bodyMass.usualSource).toEqual(scale);
  expect(result.sleep.usualSource).toEqual(bed);
  expect(result.hrv.usualSource).toEqual(result.hrv.baselineSource);
  expect(result.restingHeartRate.usualSource).toBeNull();
  expect(provenanceDisplay(result.bodyMass.today, scale)).toEqual({ showSource: true, showAge: false });
  expect(provenanceDisplay(result.hrv.today, source, true)).toEqual({ showSource: false, showAge: true });
  expect(provenanceDisplay(result.restingHeartRate.today, null, true)).toEqual({ showSource: false, showAge: false });
});

test('sleep chooses Watch over overlapping iPhone and counts asleep stages, not in-bed or awake time', () => {
  const result = deriveHealthSignals([
    sleep('phone', '2026-11-07T22:00:00Z', '2026-11-08T08:00:00Z', 'inBed', 'iPhone'),
    sleep('bed', '2026-11-07T22:00:00Z', '2026-11-08T08:00:00Z', 'inBed'),
    sleep('core', '2026-11-07T23:00:00Z', '2026-11-08T02:00:00Z'),
    sleep('awake', '2026-11-08T02:00:00Z', '2026-11-08T02:30:00Z', 'awake'),
    sleep('deep', '2026-11-08T02:30:00Z', '2026-11-08T04:00:00Z', 'asleepDeep'),
    sleep('rem', '2026-11-08T04:00:00Z', '2026-11-08T06:00:00Z', 'asleepREM'),
    sleep('unspecified', '2026-11-08T06:00:00Z', '2026-11-08T07:00:00Z', 'asleepUnspecified'),
  ], context).sleep;
  expect(result.today).toMatchObject({
    known: true, value: 450, coverage: { known: 1, of: 1, unit: 'nights' },
    provenance: [{ sampleId: 'core' }, { sampleId: 'deep' }, { sampleId: 'rem' }, { sampleId: 'unspecified' }],
  });
  expect(result.nights).toEqual([expect.objectContaining({
    day: '2026-11-08', chosenSource: source, sourceClass: 'appleWatch',
    excluded: [{ source: { bundleId: 'phone', name: 'My iPhone' }, sampleIds: ['phone'], reason: 'notUsedThisNight' }],
  })]);
});

test.each([
  ['04:59', 421, ['nap']],
  ['05:00', 240, ['second', 'nap']],
  ['05:01', 240, ['second', 'nap']],
])('only the longest sleep block counts; a second block at %s tests the strict one-hour merge limit', (start, minutes, excludedIds) => {
  const result = deriveHealthSignals([
    sleep('first', '2026-11-08T00:00:00Z', '2026-11-08T04:00:00Z'),
    sleep('second', `2026-11-08T${start}:00Z`, '2026-11-08T08:00:00Z'),
    sleep('nap', '2026-11-08T10:00:00Z', '2026-11-08T11:00:00Z'),
  ], context).sleep;
  expect(result.today).toMatchObject({ known: true, value: minutes });
  expect(result.nights[0].excluded).toEqual([{ source, sampleIds: excludedIds, reason: 'notUsedThisNight' }]);
});

test('an in-bed-only source has no known sleep duration, even when labelled Watch', () => {
  const result = deriveHealthSignals([
    sleep('bedOnly', '2026-11-07T22:00:00Z', '2026-11-08T08:00:00Z', 'inBed'),
  ], context).sleep;
  expect(result.today).toEqual({ known: false, reason: 'noSamples', coverage: { known: 0, of: 1, unit: 'nights' } });
  expect(result.nights[0]).toMatchObject({ chosenSource: source, sourceClass: 'iPhoneOrInBedOnly' });
});

test('in-bed-only classification is per night, not determined by asleep samples on another night', () => {
  const result = deriveHealthSignals([
    sleep('yesterdayAsleep', '2026-11-06T23:00:00Z', '2026-11-07T07:00:00Z'),
    sleep('todayBed', '2026-11-07T23:00:00Z', '2026-11-08T07:00:00Z', 'inBed'),
  ], context).sleep;
  expect(result.nights).toHaveLength(2);
  expect(result.nights[1]).toMatchObject({ day: '2026-11-08', sourceClass: 'iPhoneOrInBedOnly', selectedSampleIds: ['todayBed'] });
  expect(result.today).toEqual({ known: false, reason: 'noSamples', coverage: { known: 0, of: 1, unit: 'nights' } });
});

test('overlapping asleep records from the selected source do not count the same minutes twice', () => {
  const result = deriveHealthSignals([
    sleep('coreOverlap', '2026-11-07T23:00:00Z', '2026-11-08T03:00:00Z'),
    sleep('deepOverlap', '2026-11-08T02:00:00Z', '2026-11-08T07:00:00Z', 'asleepDeep'),
  ], context).sleep;
  expect(result.today).toMatchObject({ known: true, value: 480, provenance: [{ sampleId: 'coreOverlap' }, { sampleId: 'deepOverlap' }] });
});

test('awake time cannot bridge a one-hour gap between asleep blocks', () => {
  const result = deriveHealthSignals([
    sleep('longest', '2026-11-08T00:00:00Z', '2026-11-08T04:00:00Z'),
    sleep('gapAwake', '2026-11-08T04:01:00Z', '2026-11-08T04:59:00Z', 'awake'),
    sleep('shorter', '2026-11-08T05:00:00Z', '2026-11-08T08:00:00Z'),
  ], context).sleep;
  expect(result.today).toMatchObject({ known: true, value: 240, provenance: [{ sampleId: 'longest' }] });
});

test('a 03:30 wake belongs to the previous signal day, not today', () => {
  const result = deriveHealthSignals([
    sleep('earlyWake', '2026-11-07T23:00:00Z', '2026-11-08T03:30:00Z'),
  ], context).sleep;
  expect(result.today).toMatchObject({ known: false, reason: 'notYetAvailable' });
  expect(result.nights[0]).toMatchObject({ day: '2026-11-07', duration: { known: true, value: 270 } });
});

test.each([
  ['Watch', false, 'other', 'appleWatch'],
  ['iPhone', false, 'other', 'other'],
  [null, false, 'other', 'other'],
  ['Galaxy Watch', false, 'phone', 'other'],
  ['Watch', true, 'phone', 'iPhoneOrInBedOnly'],
])('sleep class uses only model %s and userEntered=%s, never source or device names', (model, userEntered, competing, expectedClass) => {
  const candidate = {
    ...sleep('candidate', '2026-11-07T23:00:00Z', '2026-11-08T07:00:00Z', 'asleepCore', model),
    source: { bundleId: 'candidate', name: 'Apple Watch' },
    device: model ? { model, name: 'Apple Watch' } : null, userEntered,
  };
  const rival = {
    ...sleep('rival', '2026-11-07T23:00:00Z', '2026-11-08T08:00:00Z', 'asleepCore', competing === 'phone' ? 'iPhone' : 'Bed sensor'),
    source: { bundleId: competing, name: 'Rival' },
  };
  const night = deriveHealthSignals([candidate, rival], context).sleep.nights[0];
  expect(night.sourceClass).toBe(expectedClass);
  expect(night.chosenSource.bundleId).toBe(model === 'Watch' && !userEntered || model === 'Galaxy Watch' ? 'candidate' : competing);
});

test('day weight uses the earliest sample, includes labelled user input, and leaves missing days unknown', () => {
  const early = { ...weight('early', '2026-11-07T05:00:00Z', 80), userEntered: true };
  const result = dailyWeights([
    weight('later', '2026-11-07T18:00:00Z', 82), early,
    weight('0330', '2026-11-07T03:30:00Z', 81),
  ], { startDay: '2026-11-06', endDay: '2026-11-08' }, context);
  expect(result).toEqual({
    coverage: { known: 2, of: 3, unit: 'days' },
    days: [
      {
        day: '2026-11-06', known: true, value: 81, coverage: { known: 1, of: 1, unit: 'days' },
        provenance: [{ source, userEntered: false, sampleId: '0330', sampleTime: ms('2026-11-07T03:30:00Z') }],
      },
      {
        day: '2026-11-07', known: true, value: 80,
        coverage: { known: 1, of: 1, unit: 'days' },
        provenance: [{ source, userEntered: true, sampleId: 'early', sampleTime: early.startMs }],
      },
      { day: '2026-11-08', known: false, reason: 'noSamples', coverage: { known: 0, of: 1, unit: 'days' } },
    ],
  });
});
