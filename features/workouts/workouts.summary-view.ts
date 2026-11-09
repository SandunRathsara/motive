import type { HealthWorkout } from '@/features/health';
import { deviceOffset, type OffsetAt } from '@/lib/utils/time';
import { capitalize, formatDate, formatKg, formatMinutes, formatNumber, formatReps, plural } from './workouts.format';
import type { WorkoutSession } from './workouts.schemas';
import { linkedWorkoutText, type Loadable } from './workouts.view-models';

/** S5 session summary. Pure: times are passed in. */

export interface SessionSummaryContent {
  sessionId: string;
  templateName: string;
  dateText: string;
  /** "45 min"; null while the session is active. */
  durationText: string | null;
  /** "4,320 kg"; "—" when no loaded working set. */
  volumeText: string;
  /** "36 bodyweight reps"; null when none. */
  bodyweightRepsText: string | null;
  setsText: string;
  muscleGroups: { muscleGroup: string; label: string; sets: number; text: string }[];
  comparison: { text: string; direction: 'up' | 'down' | 'same' } | null;
  /** The one deterministic "next time" line (TRN-8). */
  nextTimeLine: string | null;
  linkedWorkoutText: string | null;
  /** Whether it counts toward the weekly target. */
  counts: boolean;
  countsText: string;
}

export type SessionSummaryViewModel = Loadable<SessionSummaryContent> | { status: 'missing' };

export function buildSessionSummary(input: {
  session: WorkoutSession;
  summary: { volumeKg: number; workingSets: number; bodyweightReps: number; setsByMuscleGroup: readonly { muscleGroup: string; sets: number }[] };
  comparison: { previousVolumeKg: number; volumeDeltaKg: number; workingSetsDelta: number; bodyweightRepsDelta: number } | null;
  previous: { startedAt: number; prescription: { templateName: string } } | null;
  nextTimeLine: string | null;
  linkedWorkout: HealthWorkout | null;
}, offsetAt: OffsetAt = deviceOffset): SessionSummaryContent {
  const { session, summary, comparison, previous } = input;
  let comparisonView: SessionSummaryContent['comparison'] = null;
  if (comparison && previous) {
    const reference = `${previous.prescription.templateName} on ${formatDate(previous.startedAt, offsetAt)}`;
    const delta = comparison.volumeDeltaKg;
    const loaded = summary.volumeKg > 0 || comparison.previousVolumeKg > 0;
    const basis = loaded ? delta : comparison.bodyweightRepsDelta;
    const unit = loaded ? (value: number) => formatKg(Math.abs(value)) : (value: number) => formatReps(Math.abs(value));
    comparisonView = basis === 0
      ? { text: `Same as ${reference}`, direction: 'same' }
      : { text: `${basis > 0 ? '+' : '−'}${unit(basis)} vs ${reference}`, direction: basis > 0 ? 'up' : 'down' };
  }
  return {
    sessionId: session.id, templateName: session.prescription.templateName, dateText: formatDate(session.startedAt, offsetAt),
    durationText: session.endedAt === null ? null : formatMinutes(session.endedAt - session.startedAt),
    volumeText: summary.volumeKg > 0 ? formatKg(summary.volumeKg) : '—',
    bodyweightRepsText: summary.bodyweightReps > 0 ? `${formatNumber(summary.bodyweightReps)} bodyweight reps` : null,
    setsText: plural(summary.workingSets, 'working set'),
    muscleGroups: summary.setsByMuscleGroup.map(({ muscleGroup, sets }) => ({
      muscleGroup, label: capitalize(muscleGroup), sets, text: `${capitalize(muscleGroup)} · ${plural(sets, 'set')}`,
    })),
    comparison: comparisonView, nextTimeLine: input.nextTimeLine,
    linkedWorkoutText: input.linkedWorkout ? linkedWorkoutText(input.linkedWorkout) : null,
    counts: session.completed,
    countsText: session.completed ? 'Counts toward your weekly target' : 'No working sets, so this session does not count',
  };
}
