import type { HealthSample, SignalValue, Coverage, HealthReadError, HealthSignalType } from '../health.types';
import { coachingHealthAggregates, dailyWeights, evidenceHealthAggregates, healthDayKey, latestKnownTrendWeight, trendWeight, type SignalDayRange, type SignalRulesContext } from '../health.utils';
import { createHealthRepository } from './health-repository';

export const healthReadFailure = (): HealthReadError => Object.assign(new Error("Couldn't read cached Health Signals. Try again."), { kind: 'readFailed' as const });

export async function readHealthSamples(type?: HealthSignalType, range?: HealthWorkoutRange) {
  try { return (await createHealthRepository().listSamples(type, range)).rows; }
  catch { throw healthReadFailure(); }
}

/** Local read-only contracts: all derivation stays in the shared SIG rules. */
export async function getDailyWeights(range: SignalDayRange, context: SignalRulesContext = { now: Date.now() }) {
  const rows = await readHealthSamples('bodyMass');
  return dailyWeights(rows, range, context);
}

export async function getTrendWeight(day: string, context: SignalRulesContext = { now: Date.now() }) {
  const rows = await readHealthSamples('bodyMass');
  return trendWeight(rows, day, context);
}

export async function getLatestKnownTrendWeight(context: SignalRulesContext = { now: Date.now() }) {
  return latestKnownTrendWeight(await readHealthSamples('bodyMass'), context);
}

export type HealthWorkout = HealthSample & { type: 'workout' };
export type HealthWorkoutRange = { from: number; to: number };

export async function getHealthWorkouts(range: HealthWorkoutRange, context: SignalRulesContext = { now: Date.now() }): Promise<SignalValue<HealthWorkout[]> & { coverage: Coverage }> {
  const rows = await readHealthSamples('workout', range);
  const workouts = rows.filter((sample): sample is HealthWorkout => sample.type === 'workout' && sample.startMs <= context.now);
  const fromDay = healthDayKey(range.from, context), toDay = healthDayKey(range.to, context);
  const coverage: Coverage = { known: new Set(workouts.map((sample) => {
    const day = healthDayKey(sample.startMs, context);
    return day < fromDay ? fromDay : day;
  })).size, of: Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000) + 1, unit: 'days' };
  return workouts.length ? { known: true, value: workouts, coverage, provenance: workouts.map((sample) => ({
    sampleId: sample.id, sampleTime: sample.startMs, source: sample.source, userEntered: sample.userEntered,
  })) } : { known: false, reason: 'noSamples', coverage };
}

export async function getHealthCoachingContext(context: SignalRulesContext = { now: Date.now() }) {
  const rows = await readHealthSamples();
  return coachingHealthAggregates(rows, context);
}

export async function getHealthEvidenceContext(context: SignalRulesContext = { now: Date.now() }) {
  const rows = await readHealthSamples();
  return evidenceHealthAggregates(rows, context);
}
