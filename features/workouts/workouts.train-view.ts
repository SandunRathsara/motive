import { workoutActivityName, type HealthWorkout } from '@/features/health';
import { deviceOffset, type OffsetAt } from '@/lib/utils/time';
import { formatDate, formatKg, formatMinutes, formatTime, plural } from './workouts.format';
import type { SessionTemplate, SetEntry, WorkoutSession } from './workouts.schemas';
import { linkedWorkoutText, type Loadable } from './workouts.view-models';

/** S2 Train: weekly progress, templates, recent sessions and Other Activity (SIG-9). Pure: times are passed in. */

export interface TemplateCardViewModel {
  id: string;
  name: string;
  /** "5 exercises · 14 sets". */
  summaryText: string;
  /** "Last done Mon 2 Nov" or "Not done yet". */
  lastDoneText: string;
  isNext: boolean;
}

export interface RecentSessionViewModel {
  sessionId: string;
  templateName: string;
  dateText: string;
  /** "14 sets · 4,320 kg", or "No working sets". */
  summaryText: string;
  statusText: 'In progress' | 'Finished' | 'Not counted';
  /** Counts toward the weekly target and the rotation. */
  counts: boolean;
  /** "Linked: Traditional strength training · 52 min" (context only, SIG-9). */
  linkedWorkoutText: string | null;
}

export interface OtherActivityViewModel {
  id: string;
  title: string;
  /** "Tue 10 Nov, 07:30". */
  timeText: string;
  /** "30 min". */
  durationText: string;
}

export interface TrainingWeekContent {
  weekLabel: string;
  completed: number;
  target: number;
  /** "2 of 3 sessions". */
  progressText: string;
  /** 0–1, for a progress bar. */
  progressFraction: number;
  targetMet: boolean;
  active: { sessionId: string; templateName: string; detail: string } | null;
  next: { templateId: string; templateName: string } | null;
  templates: TemplateCardViewModel[];
  recentSessions: RecentSessionViewModel[];
  otherActivity: OtherActivityViewModel[];
}

export type TrainingWeekViewModel = Loadable<TrainingWeekContent>;

type OverviewSession = WorkoutSession & { sets: readonly SetEntry[] };
export interface OverviewInput {
  now: number;
  program: { rotation: readonly SessionTemplate[] };
  weeklySessionTarget: number;
  completedThisWeek: number;
  /** Newest first. */
  sessions: readonly OverviewSession[];
  active: OverviewSession | null;
  next: SessionTemplate | null;
  linking: { links: readonly { sessionId: string; workoutId: string }[]; otherActivity: readonly HealthWorkout[]; workouts: readonly HealthWorkout[] };
}

const volumeOf = (sets: readonly SetEntry[]) => sets.reduce((sum, set) => (set.type === 'working' && set.loadKg !== null ? sum + set.loadKg * set.reps : sum), 0);

export function buildTrainingWeek(input: OverviewInput, offsetAt: OffsetAt = deviceOffset, recentLimit = 10): TrainingWeekContent {
  const { target, completedThisWeek } = { target: input.weeklySessionTarget, completedThisWeek: input.completedThisWeek };
  const workoutById = new Map(input.linking.workouts.map((workout) => [workout.id, workout]));
  const linkBySession = new Map(input.linking.links.map((link) => [link.sessionId, link.workoutId]));
  const lastDone = new Map<string, number>();
  for (const session of input.sessions) {
    if (session.completed && !lastDone.has(session.templateId)) lastDone.set(session.templateId, session.startedAt);
  }
  const templates = input.program.rotation.map((template): TemplateCardViewModel => {
    const done = lastDone.get(template.id);
    const sets = template.exercises.reduce((sum, exercise) => sum + exercise.workingSets, 0);
    return {
      id: template.id, name: template.name, isNext: input.next?.id === template.id,
      summaryText: `${plural(template.exercises.length, 'exercise')} · ${plural(sets, 'set')}`,
      lastDoneText: done === undefined ? 'Not done yet' : `Last done ${formatDate(done, offsetAt)}`,
    };
  });
  const recentSessions = input.sessions.slice(0, recentLimit).map((session): RecentSessionViewModel => {
    const working = session.sets.filter((set) => set.type === 'working').length;
    const volume = volumeOf(session.sets);
    const linkedId = linkBySession.get(session.id);
    const linked = linkedId ? workoutById.get(linkedId) : undefined;
    return {
      sessionId: session.id, templateName: session.prescription.templateName, dateText: formatDate(session.startedAt, offsetAt),
      summaryText: working === 0 ? 'No working sets' : `${plural(working, 'set')}${volume > 0 ? ` · ${formatKg(volume)}` : ''}`,
      statusText: session.endedAt === null ? 'In progress' : session.completed ? 'Finished' : 'Not counted',
      counts: session.completed,
      linkedWorkoutText: linked ? linkedWorkoutText(linked) : null,
    };
  });
  const otherActivity = input.linking.otherActivity.map((workout): OtherActivityViewModel => ({
    id: workout.id, title: workoutActivityName(workout.activityType),
    timeText: `${formatDate(workout.startMs, offsetAt)}, ${formatTime(workout.startMs, offsetAt)}`,
    durationText: formatMinutes(workout.endMs - workout.startMs),
  }));
  const active = input.active
    ? { sessionId: input.active.id, templateName: input.active.prescription.templateName,
      detail: `${plural(input.active.sets.filter((set) => set.type === 'working').length, 'set')} logged` }
    : null;
  return {
    weekLabel: 'This week', completed: completedThisWeek, target,
    progressText: `${completedThisWeek} of ${target} ${target === 1 ? 'session' : 'sessions'}`,
    progressFraction: Math.min(1, completedThisWeek / Math.max(1, target)), targetMet: completedThisWeek >= target,
    active, next: input.next ? { templateId: input.next.id, templateName: input.next.name } : null,
    templates, recentSessions, otherActivity,
  };
}
