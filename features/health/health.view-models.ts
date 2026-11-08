import type {
  Coverage, HealthSample, HealthSignalType, SignalAggregateDisplayValue, SignalAvailability,
  SignalDetailViewModel, SignalDisplayValue, SignalSampleDayViewModel, SignalSparklinePoint,
  SignalStatusViewModel, SignalValue, SignalsViewModel, TodayTrendLineViewModel,
} from './health.types';
import { deriveHealthSignals, healthDayKey, provenanceDisplay, type SignalRulesContext } from './health.utils';

export const signalTitles: Record<HealthSignalType, string> = {
  bodyMass: 'Weight', sleep: 'Sleep', restingHeartRate: 'Resting heart rate', hrv: 'HRV', workout: 'Health workouts',
};
const noSamples = 'No readable samples in this window. Check Health access and source sync.';
const statusCopy = {
  unavailableOnDevice: 'Unavailable on this device', notRequested: 'Not connected to Apple Health',
  noReadableSamples: noSamples, hasSamples: 'Samples available',
  queryError: "Couldn't read this signal. Pull to refresh to try again.",
};
const number = (value: number, decimals = 0) => value.toLocaleString('en-US', { maximumFractionDigits: decimals });
const coverageText = (coverage: Coverage) => `${coverage.known} of ${coverage.of} ${coverage.unit}`;

function timeText(at: number, context: SignalRulesContext, dateOnly = false): string {
  const offset = context.utcOffsetMinutes?.(at) ?? -new Date(at).getTimezoneOffset();
  return new Date(at + offset * 60_000).toLocaleString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
    ...(!dateOnly && { hour: 'numeric', minute: '2-digit' }),
  });
}
function lastSyncText(at: number | null, context: SignalRulesContext): string {
  return at === null ? 'Not synced yet' : `Last synced ${timeText(at, context)}`;
}
function formattedValue(value: number, type: HealthSignalType): string {
  if (type === 'bodyMass') return `${number(value, 1)} kg`;
  if (type === 'hrv') return `${number(value)} ms`;
  if (type === 'restingHeartRate') return `${number(value)} bpm`;
  if (type === 'workout') return `${number(value)} workout${value === 1 ? '' : 's'}`;
  const minutes = Math.round(value);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
function status(type: HealthSignalType, availability: readonly SignalAvailability[], available: boolean): SignalStatusViewModel {
  if (!available) return 'unavailableOnDevice';
  const row = availability.find((row) => row.type === type);
  return !row ? 'notRequested' : row.state === 'requested' ? row.readState ?? 'noReadableSamples' : row.state;
}
function display(value: SignalValue<number>, type: HealthSignalType, state: SignalStatusViewModel, aggregate = false): SignalDisplayValue {
  const coverage = aggregate && value.coverage ? { coverageText: coverageText(value.coverage) } : {};
  if (!value.known) return {
    known: false, copy: value.reason === 'notYetAvailable' ? 'Not yet available'
      : value.reason === 'insufficientCoverage' ? 'Not enough data for a baseline'
        : state === 'hasSamples' ? noSamples : statusCopy[state],
    ...coverage,
  };
  const names = [...new Set(value.provenance.map((sample) => sample.source.name))];
  return { known: true, text: formattedValue(value.value, type), ...coverage,
    ...(names.length > 0 && { source: { name: names.join(', '), userEntered: value.provenance.some((sample) => sample.userEntered) } }),
  };
}
function sparkline(values: readonly SignalValue<number>[]): SignalSparklinePoint[] {
  const known = values.flatMap((value) => value.known ? [value.value] : []);
  const min = Math.min(...known), max = Math.max(...known);
  return values.map((value) => !value.known ? { known: false } : {
    known: true, level: (max === min ? 4 : Math.round((value.value - min) / (max - min) * 7)) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  });
}

export function signalsViewModel(samples: readonly HealthSample[], availability: readonly SignalAvailability[], available: boolean, context: SignalRulesContext): SignalsViewModel {
  const derived = deriveHealthSignals(samples, context);
  const types = ['bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout'] as const;
  const workouts = samples.filter((sample): sample is HealthSample & { type: 'workout' } => sample.type === 'workout' && sample.startMs <= context.now);
  const signals = types.map((type) => {
    const state = status(type, availability, available);
    const syncAt = availability.find((row) => row.type === type)?.lastQueryAt ?? null;
    if (type === 'workout') {
      const days = derived.bodyMass.series.days.map(({ day }) => {
        const daily = workouts.filter((sample) => healthDayKey(sample.startMs, context) === day);
        return daily.length ? { known: true as const, value: daily.length, provenance: [] } : { known: false as const, reason: 'noSamples' as const };
      });
      const recent = workouts.filter((sample) => healthDayKey(sample.startMs, context) >= derived.bodyMass.series.days[0].day);
      const value: SignalValue<number> = recent.length ? { known: true, value: recent.length, provenance: [] }
        : { known: false, reason: 'noSamples' };
      value.coverage = { known: days.filter((day) => day.known).length, of: 14, unit: 'days' };
      return { type, title: signalTitles[type], status: state, statusText: statusCopy[state], lastSyncText: lastSyncText(syncAt, context), points: sparkline(days), value: display(value, type, state, true) };
    }
    const signal = derived[type];
    const value = display(type === 'bodyMass' ? derived.bodyMass.latest : signal.today, type, state, type !== 'bodyMass');
    if (type === 'bodyMass' && value.known && derived.bodyMass.latest.known) {
      const { ageDays, stale } = derived.bodyMass.latest;
      value.ageText = `${stale ? 'Stale · ' : ''}${ageDays === 0 ? 'Today' : `${ageDays} day${ageDays === 1 ? '' : 's'} ago`}`;
    }
    return { type, title: signalTitles[type], status: state, statusText: statusCopy[state], lastSyncText: lastSyncText(syncAt, context), value,
      points: sparkline(signal.series.days),
      ...(type === 'bodyMass'
        ? { trendWeight: display(derived.bodyMass.trendWeight, type, state, true) as SignalAggregateDisplayValue }
        : { baseline: display(derived[type].baseline, type, state, true) as SignalAggregateDisplayValue }),
    };
  });
  const queryTimes = availability.flatMap((row) => row.lastQueryAt === null ? [] : [row.lastQueryAt]);
  return {
    connectionState: !available ? 'unavailableOnDevice' : signals.some((row) => row.status === 'notRequested') ? 'notRequested' : 'requested',
    signals, lastSyncText: lastSyncText(queryTimes.length ? Math.max(...queryTimes) : null, context),
    workouts: [...workouts].sort((a, b) => b.startMs - a.startMs).slice(0, 20).map((sample) => ({
      id: sample.id, activityName: workoutActivityName(sample.activityType), timeText: timeText(sample.startMs, context),
      durationText: `${number((sample.endMs - sample.startMs) / 60_000)} min`,
    })),
  };
}

/** HKWorkoutActivityType raw values. Unrecognized/new activities remain a generic Workout. */
export function workoutActivityName(raw: number): string {
  return ({ 13: 'Cycling', 20: 'Functional strength training', 37: 'Running', 46: 'Swimming',
    50: 'Traditional strength training', 52: 'Walking', 57: 'Yoga', 63: 'High-intensity interval training',
  } as Record<number, string>)[raw] ?? 'Workout';
}

export function signalDetailViewModel(samples: readonly HealthSample[], availability: readonly SignalAvailability[], available: boolean, type: HealthSignalType, context: SignalRulesContext): SignalDetailViewModel {
  const row = signalsViewModel(samples, availability, available, context).signals.find((row) => row.type === type)!;
  const derived = deriveHealthSignals(samples, context);
  const membership = type === 'hrv' || type === 'restingHeartRate' ? derived[type].samples : [];
  const excluded = new Set(derived.sleep.nights.flatMap((night) => night.excluded.flatMap((source) => source.sampleIds)));
  const sleepDays = new Map(derived.sleep.nights.flatMap((night) => [
    ...night.selectedSampleIds, ...night.excluded.flatMap((source) => source.sampleIds),
  ].map((id) => [id, night.day] as const)));
  const groups = new Map<string, SignalSampleDayViewModel>();
  for (const sample of [...samples].filter((sample) => sample.type === type && sample.endMs <= context.now).sort((a, b) => b.startMs - a.startMs)) {
    const day = sample.type === 'sleep' ? sleepDays.get(sample.id) ?? healthDayKey(sample.endMs, context) : healthDayKey(sample.startMs, context);
    const group = groups.get(day) ?? { id: day, dayText: new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }), samples: [] };
    groups.set(day, { ...group, samples: [...group.samples, {
      id: sample.id, valueText: 'value' in sample ? formattedValue(sample.value, sample.type)
        : sample.type === 'workout' ? workoutActivityName(sample.activityType)
          : ({ inBed: 'In bed', awake: 'Awake', asleepCore: 'Core sleep', asleepDeep: 'Deep sleep', asleepREM: 'REM sleep', asleepUnspecified: 'Asleep' })[sample.stage],
      timeText: `${timeText(sample.startMs, context)}${sample.endMs !== sample.startMs ? ` – ${timeText(sample.endMs, context)}` : ''}`,
      source: { name: sample.source.name, userEntered: sample.userEntered },
      ...(membership.some((entry) => entry.sampleId === sample.id && !entry.inBaseline) && { notInBaseline: true }),
      ...(sample.type === 'sleep' && excluded.has(sample.id) && { notUsedThisNight: true }),
    }] });
  }
  return { type, title: row.title, value: row.value, status: row.status, statusText: row.statusText, lastSyncText: row.lastSyncText,
    days: [...groups.values()].sort((a, b) => b.id.localeCompare(a.id)) };
}

export function todayTrendLineViewModel(samples: readonly HealthSample[], context: SignalRulesContext): TodayTrendLineViewModel | null {
  const derived = deriveHealthSignals(samples, context);
  const line = derived.trendLine;
  if (!line) return null;
  const signal = derived[line.signal];
  const provenance = provenanceDisplay(line.last7, signal.usualSource);
  const sourceLabel = provenance.showSource ? [...new Set(line.last7.provenance.map((sample) => sample.source.name))].join(', ') : undefined;
  const delta = line.deltaUnit === 'minutes' ? `${number(line.delta)} min` : `${number(line.delta)}${line.deltaUnit === 'percent' ? '%' : ' bpm'}`;
  return { type: line.signal,
    text: `${signalTitles[line.signal]} ${delta} ${line.signal === 'restingHeartRate' ? 'above' : 'below'} baseline · ${coverageText(line.coverage)} · baseline ${coverageText(line.baseline.coverage)}`,
    ...(sourceLabel && { sourceLabel }),
  };
}
