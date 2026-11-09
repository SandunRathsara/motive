import type { HealthWorkout } from '@/features/health';
import { deviceOffset, type OffsetAt } from '@/lib/utils/time';
import {
  capitalize, formatDate, formatKg, formatMinutes, formatNumber, formatReps, formatSet, formatTime, plural, spokenSet,
} from './workouts.format';
import { restSecondsFor } from './workouts.history';
import type { ProgressionResult } from './workouts.progression';
import type { ExerciseLibraryEntry, SessionTemplate, SetEntry, TemplateExercise, WorkoutSession } from './workouts.schemas';

/**
 * UI-ready view models for the training screens. Everything the screens print is formatted here (copy
 * the spec defines, like "last 80 × 9"), so components stay presentational. Pure: times are passed in.
 */

// ---- S3: active session ----

export type ChipSaveState = 'idle' | 'saving' | 'saved' | 'failed';

export interface SetChipViewModel {
  /** Stable across logging (the same row stays mounted when a chip is saved). */
  key: string;
  templateExerciseId: string;
  /** "Set 2", "Warmup 1", "Extra set". */
  label: string;
  kind: 'working' | 'warmup' | 'extra';
  /** Present once committed; used to edit or delete. */
  setId: string | null;
  loadKg: number | null;
  reps: number;
  bodyweight: boolean;
  /** The value is a Recommended Set (false on an exercise's first session and for warmups). */
  recommended: boolean;
  last: { loadKg: number | null; reps: number } | null;
  saveState: ChipSaveState;
  /** First session of a loaded exercise: no load until the owner sets one with the steppers. */
  needsLoad: boolean;
  /** Below the bottom of the range at the recommended load: neutral marker, no judgment (TRN-6). */
  failedSet: boolean;
  /** "80 × 9", or "9 reps" for bodyweight. */
  primaryText: string;
  /** "last 80 × 9". */
  secondaryText: string | null;
  /** "80 kilograms, 9 reps, recommended". */
  accessibilityLabel: string;
}

export interface ExerciseCardViewModel {
  templateExerciseId: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  muscleGroupLabel: string;
  bodyweight: boolean;
  /** "3 × 6–10". */
  prescriptionText: string;
  /** "2 of 3 sets". */
  progressText: string;
  expanded: boolean;
  complete: boolean;
  firstSession: boolean;
  /** Load step for the stepper: the exercise's increment (reps always step by 1). */
  incrementKg: number;
  repRange: { min: number; max: number };
  restSeconds: number;
  /** Load Reset reason, e.g. "Reset after 2 sessions under 6 reps"; null otherwise. */
  reasonLine: string | null;
  chips: SetChipViewModel[];
}

export interface ActiveSessionContent {
  sessionId: string;
  templateName: string;
  startedAt: number;
  /** False for a finished session being corrected (G9): no new unlogged chips. */
  active: boolean;
  deload: boolean;
  exercises: ExerciseCardViewModel[];
  loggedWorkingSets: number;
  prescribedWorkingSets: number;
  /** "9 of 15 sets". */
  progressText: string;
  rest: { deadlineMs: number; durationSeconds: number } | null;
}

export type ActiveSessionViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({ status: 'ready' } & ActiveSessionContent);

export interface ChipDraft { loadKg: number | null; reps: number }
export interface ChipPending extends ChipDraft { status: 'saving' | 'failed' }
export interface SessionUiState {
  expandedExerciseId: string | null;
  drafts: Readonly<Record<string, ChipDraft>>;
  pending: Readonly<Record<string, ChipPending>>;
  rest: { deadlineMs: number; durationSeconds: number } | null;
}

export interface SessionDetailInput {
  session: WorkoutSession;
  exercises: {
    templateExercise: TemplateExercise;
    exercise: ExerciseLibraryEntry | null;
    bodyweight: boolean;
    progression: ProgressionResult;
    sets: SetEntry[];
  }[];
}

const EPSILON = 1e-9;
export const chipKey = (templateExerciseId: string, position: string | number) => `${templateExerciseId}:${position}`;
export const prescriptionText = ({ workingSets, repRange }: Pick<TemplateExercise, 'workingSets' | 'repRange'>) =>
  `${workingSets} × ${repRange.min === repRange.max ? repRange.min : `${repRange.min}–${repRange.max}`}`;

function chipText(chip: { loadKg: number | null; reps: number; bodyweight: boolean; recommended: boolean }, saved: boolean) {
  // A loaded exercise with no load yet (first session) reads "— × 6", not a reps-only set.
  const unset = !chip.bodyweight && chip.loadKg === null;
  const spoken = [unset ? `Load not set, ${formatReps(chip.reps)}` : spokenSet(chip.loadKg, chip.reps)];
  if (chip.recommended) spoken.push('recommended');
  if (saved) spoken.push('saved');
  return { primaryText: unset ? `— × ${formatNumber(chip.reps)}` : formatSet(chip.loadKg, chip.reps), accessibilityLabel: spoken.join(', ') };
}

function buildChips(
  entry: SessionDetailInput['exercises'][number], editable: boolean, ui: SessionUiState,
): SetChipViewModel[] {
  const { templateExercise, progression, bodyweight, sets } = entry;
  const { min } = templateExercise.repRange;
  const working = sets.filter((set) => set.type === 'working').sort((a, b) => a.index - b.index);
  const warmups = sets.filter((set) => set.type === 'warmup').sort((a, b) => a.index - b.index);
  const recommended = progression.recommendedSets;
  const recommendedLoad = recommended?.[0]?.loadKg ?? null;
  const prescribed = templateExercise.workingSets;
  const lastLogged = working.at(-1) ?? null;

  const saved = (set: SetEntry, kind: SetChipViewModel['kind'], label: string, position: string | number, slot: number | null): SetChipViewModel => {
    const rec = kind === 'working' && slot !== null ? recommended?.[slot] ?? null : null;
    const last = kind === 'working' && slot !== null ? progression.lastSets[slot] ?? null : null;
    const failed = kind !== 'warmup' && set.reps < min
      && (bodyweight || recommendedLoad === null || (set.loadKg ?? 0) >= recommendedLoad - EPSILON);
    return {
      key: chipKey(templateExercise.id, position), templateExerciseId: templateExercise.id, label, kind, setId: set.id,
      loadKg: set.loadKg, reps: set.reps, bodyweight, recommended: rec !== null, last, saveState: 'saved', needsLoad: false, failedSet: failed,
      secondaryText: last ? `last ${formatSet(last.loadKg, last.reps)}` : null,
      ...chipText({ loadKg: set.loadKg, reps: set.reps, bodyweight, recommended: rec !== null }, true),
    };
  };

  const chips: SetChipViewModel[] = warmups.map((set, index) => saved(set, 'warmup', `Warmup ${index + 1}`, `w${index}`, null));

  const slots = editable ? Math.max(prescribed, working.length + 1) : working.length;
  for (let slot = 0; slot < slots; slot++) {
    const logged = working[slot];
    const kind = slot < prescribed ? 'working' : 'extra';
    const label = kind === 'working' ? `Set ${slot + 1}` : 'Extra set';
    if (logged) { chips.push(saved(logged, kind, label, slot, slot < prescribed ? slot : null)); continue; }
    // Unlogged slot. Only the first one past the prescribed sets is offered.
    const key = chipKey(templateExercise.id, slot);
    const rec = kind === 'working' ? recommended?.[slot] ?? null : null;
    // What is being saved stays as committed; after a failure, a newer stepper draft wins so the retry logs it.
    const pending = ui.pending[key];
    const draft = pending?.status === 'saving' ? pending : ui.drafts[key] ?? pending;
    // No recommendation: reps start at the bottom of the range (D3); later sets copy the first load.
    const base: ChipDraft = rec
      ? { loadKg: rec.loadKg, reps: rec.reps }
      : { loadKg: bodyweight ? null : lastLogged?.loadKg ?? null, reps: kind === 'extra' && lastLogged ? lastLogged.reps : min };
    const value: ChipDraft = draft ?? base;
    const last = kind === 'working' ? progression.lastSets[slot] ?? null : null;
    const isRecommended = rec !== null && draft === undefined;
    const needsLoad = !bodyweight && value.loadKg === null;
    chips.push({
      key, templateExerciseId: templateExercise.id, label, kind, setId: null,
      loadKg: value.loadKg, reps: value.reps, bodyweight, recommended: isRecommended, last,
      saveState: ui.pending[key]?.status ?? 'idle', needsLoad, failedSet: false,
      secondaryText: last ? `last ${formatSet(last.loadKg, last.reps)}` : null,
      ...chipText({ loadKg: value.loadKg, reps: value.reps, bodyweight, recommended: isRecommended }, false),
    });
  }
  return chips;
}

export function buildActiveSession(detail: SessionDetailInput, ui: SessionUiState): ActiveSessionContent {
  const { session } = detail;
  const active = session.endedAt === null;
  const exercises = detail.exercises.map((entry): ExerciseCardViewModel => {
    const { templateExercise, exercise, bodyweight, progression, sets } = entry;
    const loggedWorking = sets.filter((set) => set.type === 'working').length;
    const muscleGroup = exercise?.muscleGroup ?? 'other';
    return {
      templateExerciseId: templateExercise.id, exerciseId: templateExercise.exerciseId,
      name: exercise?.name ?? templateExercise.exerciseId, muscleGroup, muscleGroupLabel: capitalize(muscleGroup), bodyweight,
      prescriptionText: prescriptionText(templateExercise),
      progressText: `${Math.min(loggedWorking, templateExercise.workingSets)} of ${templateExercise.workingSets} sets`,
      expanded: ui.expandedExerciseId === templateExercise.id,
      complete: loggedWorking >= templateExercise.workingSets,
      firstSession: progression.recommendedSets === null,
      incrementKg: templateExercise.incrementKg, repRange: templateExercise.repRange,
      restSeconds: restSecondsFor(templateExercise),
      reasonLine: progression.loadReset?.reasonLine ?? null,
      chips: buildChips(entry, active, ui),
    };
  });
  const prescribed = detail.exercises.reduce((sum, entry) => sum + entry.templateExercise.workingSets, 0);
  const logged = detail.exercises.reduce((sum, entry) => sum + Math.min(entry.sets.filter((set) => set.type === 'working').length, entry.templateExercise.workingSets), 0);
  return {
    sessionId: session.id, templateName: session.prescription.templateName, startedAt: session.startedAt, active, deload: session.deload,
    exercises, loggedWorkingSets: logged, prescribedWorkingSets: prescribed, progressText: `${logged} of ${prescribed} sets`, rest: ui.rest,
  };
}

// ---- S4: set sheet ----

export interface SetSheetViewModel {
  /** "Back Squat · Set 2". */
  title: string;
  templateExerciseId: string;
  /** Present when editing a committed set. */
  setId: string | null;
  chipKey: string;
  type: 'working' | 'warmup';
  loadKg: number | null;
  reps: number;
  bodyweight: boolean;
  /** Stepper load step (the exercise's increment); reps step by 1. */
  incrementKg: number;
  isSaved: boolean;
  saveState: ChipSaveState;
  canDelete: boolean;
}

export function buildSetSheet(card: ExerciseCardViewModel, chip: SetChipViewModel): SetSheetViewModel {
  return {
    title: `${card.name} · ${chip.label}`, templateExerciseId: chip.templateExerciseId, setId: chip.setId, chipKey: chip.key,
    type: chip.kind === 'warmup' ? 'warmup' : 'working', loadKg: chip.loadKg, reps: chip.reps, bodyweight: chip.bodyweight,
    incrementKg: card.incrementKg, isSaved: chip.setId !== null, saveState: chip.saveState, canDelete: chip.setId !== null,
  };
}

// ---- Today ----

export type TodayTrainingViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | {
    status: 'ready';
    action: 'start' | 'resume' | 'none';
    templateId: string | null;
    templateName: string | null;
    sessionId: string | null;
    /** "Start" or "Resume". */
    buttonLabel: string;
    /** "Full Body" */
    title: string;
    /** "Next in your rotation" or "9 sets logged". */
    detail: string;
    /** "Start Full Body" / "Resume Full Body". */
    accessibilityLabel: string;
  };

export function buildTodayTraining(input: {
  active: (WorkoutSession & { sets: readonly SetEntry[] }) | null; next: SessionTemplate | null;
}): Extract<TodayTrainingViewModel, { status: 'ready' }> {
  if (input.active) {
    const name = input.active.prescription.templateName;
    const working = input.active.sets.filter((set) => set.type === 'working').length;
    return {
      status: 'ready', action: 'resume', templateId: input.active.templateId, templateName: name, sessionId: input.active.id,
      buttonLabel: 'Resume', title: name, detail: working === 0 ? 'In progress' : `${plural(working, 'set')} logged`,
      accessibilityLabel: `Resume ${name}`,
    };
  }
  if (input.next) {
    return {
      status: 'ready', action: 'start', templateId: input.next.id, templateName: input.next.name, sessionId: null,
      buttonLabel: 'Start', title: input.next.name, detail: 'Next in your rotation', accessibilityLabel: `Start ${input.next.name}`,
    };
  }
  return {
    status: 'ready', action: 'none', templateId: null, templateName: null, sessionId: null,
    buttonLabel: 'Start', title: 'No Session Templates', detail: 'Add a Session Template in your Training Program', accessibilityLabel: 'No Session Templates',
  };
}

// ---- S2: Train ----

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

export type TrainingWeekViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({ status: 'ready' } & TrainingWeekContent);

/** HKWorkoutActivityType raw values; unknown activities stay a generic "Workout". */
export function workoutActivityName(raw: number): string {
  return ({ 13: 'Cycling', 20: 'Functional strength training', 37: 'Running', 46: 'Swimming',
    50: 'Traditional strength training', 52: 'Walking', 57: 'Yoga', 63: 'High-intensity interval training',
  } as Record<number, string>)[raw] ?? 'Workout';
}

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
      linkedWorkoutText: linked ? `Linked: ${workoutActivityName(linked.activityType)} · ${formatMinutes(linked.endMs - linked.startMs)}` : null,
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

// ---- S5: summary ----

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

export type SessionSummaryViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'missing' }
  | ({ status: 'ready' } & SessionSummaryContent);

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
    linkedWorkoutText: input.linkedWorkout
      ? `Linked: ${workoutActivityName(input.linkedWorkout.activityType)} · ${formatMinutes(input.linkedWorkout.endMs - input.linkedWorkout.startMs)}`
      : null,
    counts: session.completed,
    countsText: session.completed ? 'Counts toward your weekly target' : 'No working sets, so this session does not count',
  };
}

// ---- Exercise history ----

export interface ExerciseHistoryContent {
  exerciseId: string;
  name: string;
  muscleGroupLabel: string;
  sessionCountText: string;
  sessions: {
    sessionId: string;
    templateName: string;
    dateText: string;
    /** "80 × 9, 80 × 9, 80 × 8". */
    setsText: string;
    warmupText: string | null;
  }[];
}

export type ExerciseHistoryViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({ status: 'ready' } & ExerciseHistoryContent);

export function buildExerciseHistory(
  exerciseId: string, exercise: ExerciseLibraryEntry | null,
  history: readonly { session: WorkoutSession; sets: readonly SetEntry[] }[], offsetAt: OffsetAt = deviceOffset,
): ExerciseHistoryContent {
  const join = (sets: readonly SetEntry[]) => sets.map((set) => formatSet(set.loadKg, set.reps)).join(', ');
  return {
    exerciseId, name: exercise?.name ?? exerciseId, muscleGroupLabel: capitalize(exercise?.muscleGroup ?? 'other'),
    sessionCountText: plural(history.length, 'session'),
    sessions: history.map(({ session, sets }) => {
      const ordered = [...sets].sort((a, b) => a.index - b.index);
      const working = ordered.filter((set) => set.type === 'working');
      const warmups = ordered.filter((set) => set.type === 'warmup');
      return {
        sessionId: session.id, templateName: session.prescription.templateName, dateText: formatDate(session.startedAt, offsetAt),
        setsText: working.length ? join(working) : 'Warmups only', warmupText: warmups.length ? `Warmup ${join(warmups)}` : null,
      };
    }),
  };
}

// ---- Calm error copy ----

/** Typed errors map to short, blame-free messages (DATA-2: a failed commit is "not saved"). */
export function workoutErrorText(error: unknown): string | undefined {
  if (!error) return undefined;
  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : undefined;
  switch (code) {
    case 'activeSessionExists': return 'A session is already in progress. Resume it or finish it first.';
    case 'notFound': return 'That session or set no longer exists.';
    case 'recordWritesBlocked': return 'Saving is paused while your data is exported or erased.';
    case 'invalidState': return "Those values can't be saved. Check them and try again.";
    case 'readFailed': case 'invalidRows': return "Couldn't read your training log.";
    default: return 'Not saved. Nothing was changed. Try again.';
  }
}
