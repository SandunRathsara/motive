import { capitalize, formatNumber, formatReps, formatSet, spokenSet } from './workouts.format';
import { restSecondsFor } from './workouts.history';
import type { ProgressionResult } from './workouts.progression';
import type { ExerciseLibraryEntry, SetEntry, TemplateExercise, WorkoutSession } from './workouts.schemas';
import type { Loadable } from './workouts.view-models';

/**
 * UI-ready view models for the active session (S3) and its set sheet (S4). Everything the screens print is
 * formatted here (copy the spec defines, like "last 80 × 9"), so components stay presentational. Pure.
 */

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

export type ActiveSessionViewModel = Loadable<ActiveSessionContent>;

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
  entry: SessionDetailInput['exercises'][number], editable: boolean, uiState: SessionUiState,
): SetChipViewModel[] {
  const { templateExercise, progression, bodyweight, sets } = entry;
  const { min } = templateExercise.repRange;
  const working = sets.filter((set) => set.type === 'working').sort((a, b) => a.index - b.index);
  const warmups = sets.filter((set) => set.type === 'warmup').sort((a, b) => a.index - b.index);
  const recommended = progression.recommendedSets;
  const recommendedLoad = recommended?.[0]?.loadKg ?? null;
  const prescribed = templateExercise.workingSets;
  const lastLogged = working.at(-1) ?? null;

  const savedChip = ({ set, kind, label, position, slot }: {
    set: SetEntry; kind: SetChipViewModel['kind']; label: string; position: string | number; slot: number | null;
  }): SetChipViewModel => {
    const recommendedSet = kind === 'working' && slot !== null ? recommended?.[slot] ?? null : null;
    const last = kind === 'working' && slot !== null ? progression.lastSets[slot] ?? null : null;
    const failed = kind !== 'warmup' && set.reps < min
      && (bodyweight || recommendedLoad === null || (set.loadKg ?? 0) >= recommendedLoad - EPSILON);
    return {
      key: chipKey(templateExercise.id, position), templateExerciseId: templateExercise.id, label, kind, setId: set.id,
      loadKg: set.loadKg, reps: set.reps, bodyweight, recommended: recommendedSet !== null, last, saveState: 'saved', needsLoad: false, failedSet: failed,
      secondaryText: last ? `last ${formatSet(last.loadKg, last.reps)}` : null,
      ...chipText({ loadKg: set.loadKg, reps: set.reps, bodyweight, recommended: recommendedSet !== null }, true),
    };
  };

  const chips: SetChipViewModel[] = warmups.map((set, index) => savedChip({ set, kind: 'warmup', label: `Warmup ${index + 1}`, position: `w${index}`, slot: null }));

  const slots = editable ? Math.max(prescribed, working.length + 1) : working.length;
  for (let slot = 0; slot < slots; slot++) {
    const logged = working[slot];
    const kind = slot < prescribed ? 'working' : 'extra';
    const label = kind === 'working' ? `Set ${slot + 1}` : 'Extra set';
    if (logged) { chips.push(savedChip({ set: logged, kind, label, position: slot, slot: kind === 'working' ? slot : null })); continue; }
    // Unlogged slot. Only the first one past the prescribed sets is offered.
    const key = chipKey(templateExercise.id, slot);
    const recommendedSet = kind === 'working' ? recommended?.[slot] ?? null : null;
    // What is being saved stays as committed; after a failure, a newer stepper draft wins so the retry logs it.
    const pending = uiState.pending[key];
    const draft = pending?.status === 'saving' ? pending : uiState.drafts[key] ?? pending;
    // No recommendation: reps start at the bottom of the range (D3); later sets copy the first load.
    const base: ChipDraft = recommendedSet
      ? { loadKg: recommendedSet.loadKg, reps: recommendedSet.reps }
      : { loadKg: bodyweight ? null : lastLogged?.loadKg ?? null, reps: kind === 'extra' && lastLogged ? lastLogged.reps : min };
    const value: ChipDraft = draft ?? base;
    const last = kind === 'working' ? progression.lastSets[slot] ?? null : null;
    const isRecommended = recommendedSet !== null && draft === undefined;
    const needsLoad = !bodyweight && value.loadKg === null;
    chips.push({
      key, templateExerciseId: templateExercise.id, label, kind, setId: null,
      loadKg: value.loadKg, reps: value.reps, bodyweight, recommended: isRecommended, last,
      saveState: uiState.pending[key]?.status ?? 'idle', needsLoad, failedSet: false,
      secondaryText: last ? `last ${formatSet(last.loadKg, last.reps)}` : null,
      ...chipText({ loadKg: value.loadKg, reps: value.reps, bodyweight, recommended: isRecommended }, false),
    });
  }
  return chips;
}

export function buildActiveSession(detail: SessionDetailInput, uiState: SessionUiState): ActiveSessionContent {
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
      expanded: uiState.expandedExerciseId === templateExercise.id,
      complete: loggedWorking >= templateExercise.workingSets,
      firstSession: progression.recommendedSets === null,
      incrementKg: templateExercise.incrementKg, repRange: templateExercise.repRange,
      restSeconds: restSecondsFor(templateExercise),
      reasonLine: progression.loadReset?.reasonLine ?? null,
      chips: buildChips(entry, active, uiState),
    };
  });
  const prescribed = detail.exercises.reduce((sum, entry) => sum + entry.templateExercise.workingSets, 0);
  const logged = detail.exercises.reduce((sum, entry) => sum + Math.min(entry.sets.filter((set) => set.type === 'working').length, entry.templateExercise.workingSets), 0);
  return {
    sessionId: session.id, templateName: session.prescription.templateName, startedAt: session.startedAt, active, deload: session.deload,
    exercises, loggedWorkingSets: logged, prescribedWorkingSets: prescribed, progressText: `${logged} of ${prescribed} sets`, rest: uiState.rest,
  };
}


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
