import type { HealthSample, SignalAvailability } from './health.types';
import { signalsViewModel, signalDetailViewModel, todayTrendLineViewModel, workoutActivityName } from './health.view-models';

const now = Date.parse('2026-11-08T12:00:00Z');
const context = { now, utcOffsetMinutes: () => 0 };
const common = (id: string, at = now) => ({
  id, uuid: id, startMs: at, endMs: at,
  source: { bundleId: 'scale', name: 'Scale' }, sourceRevision: {}, device: null, userEntered: true,
});
const sample = (id: string, at = now): HealthSample => ({ ...common(id, at), type: 'bodyMass', value: 80.25, unit: 'kg' });

test.each([
  ['unavailableOnDevice', 'Unavailable on this device'],
  ['notRequested', 'Not connected to Apple Health'],
  ['hasSamples', 'Samples available'],
  ['noReadableSamples', 'No readable samples in this window. Check Health access and source sync.'],
  ['queryError', "Couldn't read this signal. Pull to refresh to try again."],
] as const)('%s status copy is preformatted for S10 and S11', (state, statusText) => {
  const row: SignalAvailability = { type: 'bodyMass', lastQueryAt: now, lastSampleAt: null,
    ...(state === 'unavailableOnDevice' || state === 'notRequested' ? { state, readState: null } : { state: 'requested', readState: state }) };
  expect(signalsViewModel([], [row], true, context).signals[0]).toMatchObject({ statusText });
  expect(signalDetailViewModel([], [row], true, 'bodyMass', context)).toMatchObject({ statusText });
});

test.each(['sleep', 'hrv', 'restingHeartRate'] as const)('%s daily aggregate shows known and unknown coverage in S10 and S11', (type) => {
  const measured = { ...common('one', now - 5 * 3_600_000), userEntered: false, device: { model: 'Watch' } };
  const samples: HealthSample[] = type === 'sleep'
    ? [{ ...measured, type, stage: 'asleepCore', startMs: now - 12 * 3_600_000 }]
    : [40, 60].map((value, index) => ({ ...measured, id: String(index), value,
      ...(type === 'hrv' ? { type, unit: 'ms' as const } : { type, unit: 'bpm' as const }) }));
  for (const known of [true, false]) {
    const input = known ? samples : [];
    const expected = { known, coverageText: `${known ? 1 : 0} of 1 ${type === 'sleep' ? 'nights' : 'days'}`,
      ...(known ? { text: type === 'sleep' ? '7 h 0 min' : type === 'hrv' ? '50 ms' : '50 bpm' } : { copy: 'Not yet available' }) };
    expect(signalsViewModel(input, [], true, context).signals.find((row) => row.type === type)?.value).toMatchObject(expected);
    expect(signalDetailViewModel(input, [], true, type, context).value).toMatchObject(expected);
  }
});

test('details group by the 04:00 day, keep user-entered labels and mark samples excluded from HRV baselines and sleep nights', () => {
  const early = sample('early', Date.parse('2026-11-08T03:30:00Z'));
  expect(signalDetailViewModel([early], availability, true, 'bodyMass', context).days[0]).toMatchObject({
    id: '2026-11-07', dayText: 'Nov 7, 2026', samples: [{ source: { userEntered: true }, timeText: expect.stringContaining('3:30 AM') }],
  });
  const manual: HealthSample = { ...sample('manual'), type: 'hrv', value: 40, unit: 'ms' };
  expect(signalDetailViewModel([manual], [], true, 'hrv', context).days[0].samples[0]).toMatchObject({
    valueText: '40 ms', notInBaseline: true, source: { userEntered: true },
  });
  const sleep: HealthSample = { ...common('watch', now - 12 * 3_600_000), type: 'sleep', stage: 'asleepCore', endMs: now - 5 * 3_600_000,
    device: { model: 'Watch' }, userEntered: false };
  const phone: HealthSample = { ...sleep, id: 'phone', source: { bundleId: 'phone', name: 'Phone' }, device: { model: 'iPhone' } };
  const rows = signalDetailViewModel([sleep, phone], [], true, 'sleep', context).days[0].samples;
  expect(rows.find((row) => row.id === 'phone')?.notUsedThisNight).toBe(true);
  expect(rows.find((row) => row.id === 'watch')?.notUsedThisNight).toBeUndefined();
});

test('stale weight keeps its age, missing values use SIG-3 copy, and workouts use native raw activity values with fallback', () => {
  const model = signalsViewModel([sample('old', now - 8 * 86_400_000)], availability, true, context);
  expect(model.signals[0].value).toMatchObject({ ageText: 'Stale · 8 days ago' });
  expect(model.signals[0].trendWeight).toMatchObject({ known: false, copy: 'No readable samples in this window. Check Health access and source sync.', coverageText: '0 of 7 days' });
  expect(workoutActivityName(50)).toBe('Traditional strength training');
  expect(workoutActivityName(9999)).toBe('Workout');
  const workout: HealthSample = { ...common('workout'), type: 'workout', activityType: 37 };
  expect(signalsViewModel([workout], [], true, context).signals[4].value).toMatchObject({ text: '1 workout', coverageText: '1 of 14 days' });
});

test('Today includes both aggregate coverages, hides usual source and fresh age, but labels an unusual source', () => {
  const nights: HealthSample[] = Array.from({ length: 35 }, (_, index) => {
    const endMs = Date.parse('2026-10-05T07:00:00Z') + index * 86_400_000;
    return { ...common(`sleep-${index}`, endMs - (index < 28 ? 8 : 7) * 3_600_000), type: 'sleep', stage: 'asleepCore', endMs,
      userEntered: false, device: { model: 'Watch' } };
  });
  expect(todayTrendLineViewModel(nights, context)).toEqual({ type: 'sleep', text: 'Sleep 60 min below baseline · 7 of 7 nights · baseline 28 of 28 nights' });
  nights[34] = { ...nights[34], source: { bundleId: 'other', name: 'Other wearable' } };
  expect(todayTrendLineViewModel(nights, context)).toMatchObject({ sourceLabel: 'Scale, Other wearable' });
});

test('sleep stages are grouped under the chosen night’s wake day, including stages ending before 04:00', () => {
  const first: HealthSample = { ...common('first', Date.parse('2026-11-07T23:00:00Z')), type: 'sleep', stage: 'asleepCore',
    endMs: Date.parse('2026-11-08T03:00:00Z'), device: { model: 'Watch' }, userEntered: false };
  const second: HealthSample = { ...first, id: 'second', startMs: Date.parse('2026-11-08T03:15:00Z'), endMs: Date.parse('2026-11-08T07:00:00Z') };
  const days = signalDetailViewModel([first, second], [], true, 'sleep', context).days;
  expect(days).toHaveLength(1);
  expect(days[0]).toMatchObject({ id: '2026-11-08', dayText: 'Nov 8, 2026' });
  expect(days[0].samples.map((row) => row.id)).toEqual(['second', 'first']);
});
const availability: SignalAvailability[] = [{ type: 'bodyMass', state: 'requested', readState: 'hasSamples', lastQueryAt: now, lastSampleAt: now }];

test('formats latest weight, coverage, provenance, sync time and fourteen gaps without inventing today values', () => {
  const model = signalsViewModel([sample('weight')], availability, true, context);
  expect(model.connectionState).toBe('notRequested');
  expect(model.signals[0]).toMatchObject({ title: 'Weight', status: 'hasSamples',
    value: { known: true, text: '80.3 kg', source: { name: 'Scale', userEntered: true }, ageText: 'Today' },
    trendWeight: { known: true, text: '80.3 kg', coverageText: '1 of 7 days' },
  });
  expect(model.signals[0].lastSyncText).toContain('Last synced');
  expect(model.signals[0].points).toEqual([...Array.from({ length: 13 }, () => ({ known: false })), { known: true, level: 4 }]);
  expect(model.signals[1]).toMatchObject({ value: { known: false, copy: 'Not yet available' },
    baseline: { known: false, coverageText: '0 of 28 nights' } });
  expect(signalsViewModel([], [], false, context).signals.every((row) => row.status === 'unavailableOnDevice')).toBe(true);
  expect(todayTrendLineViewModel([], context)).toBeNull();
});
