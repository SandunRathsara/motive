import { getHealthWorkouts, type HealthWorkout } from '@/features/health';
import { metrics, type MetricEvent } from '@/features/metrics';
import { appendVersionIn, createPlanRepository, planStore, PlanStoreError, type PlanAppendResult, type PlanChanges, type PlanState } from '@/features/plan';
import { logEvent } from '@/lib/logger';
import type { SqlConnection, SqlExecutor } from '@/lib/persistence';
import { dayKey, deviceOffset, type OffsetAt } from '@/lib/utils/time';
import { getExerciseById } from '../workouts.content';
import { WorkoutsError } from '../workouts.errors';
import {
  isBodyweight, progressionHistory, progressionPrescription, toNextTimeOutcome, type SessionWithSets,
} from '../workouts.history';
import { linkWorkouts, type WorkoutLinking } from '../workouts.linking';
import { computeProgression, type ProgressionResult } from '../workouts.progression';
import { completedCountsByWeek, completedInWeek, nextTemplate, trainingWeekBounds, type TrainingWeek } from '../workouts.schedule';
import type { SetEntry, SetType, SessionTemplate, TemplateExercise, TrainingProgram, WorkoutSession } from '../workouts.schemas';
import { compareWithPrevious, nextTimeLine, previousCompletedSession, summarizeSession, type NextTimeOutcome, type SessionComparison, type SessionSummary } from '../workouts.summary';
import { createWorkoutRepository, inWorkoutTransaction, type WorkoutRepository } from './workout-repository';

const DAY = 86_400_000;

/** What the UI holds for the 5 s undo window (D2); the service applies the inverse atomically. */
export type UndoToken =
  | { kind: 'deleteSet'; setId: string }
  | { kind: 'restoreSet'; entry: SetEntry }
  | { kind: 'restoreSession'; session: WorkoutSession; sets: SetEntry[] };

export interface LogSetInput {
  sessionId: string;
  templateExerciseId: string;
  type?: SetType;
  /** Null for bodyweight exercises. */
  loadKg: number | null;
  reps: number;
  /** Set-logging time per D1 (ms), measured by the caller. Only this number is recorded (DATA-8). */
  durationMs: number;
}

export interface EditSetInput {
  setId: string;
  loadKg?: number | null;
  reps?: number;
  type?: SetType;
  /** Time spent editing (ms); recorded under the distinct edit-after-save event type. */
  durationMs?: number;
}

export interface WorkoutServiceOptions {
  connection?: SqlExecutor;
  now?: () => number;
  newId?: () => string;
  offsetAt?: OffsetAt;
  /** Gate Metrics sink; failures never fail or undo the set (DATA-8). */
  recordMetric?: (event: MetricEvent) => Promise<void>;
  /** Cached Health workouts for linking (SIG-9); unavailable Health data means no links. */
  healthWorkouts?: (range: { from: number; to: number }, now: number) => Promise<HealthWorkout[]>;
  /** Test seam: runs inside the transaction after the writes; a throw rolls everything back. */
  beforeCommit?: () => Promise<void>;
}

/** Local ids only need to be unique; Hermes isn't assumed to provide Web Crypto. */
function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

async function defaultHealthWorkouts(range: { from: number; to: number }, now: number): Promise<HealthWorkout[]> {
  try {
    const result = await getHealthWorkouts(range, { now });
    return result.known ? result.value : [];
  } catch {
    // Other Activity is context only; a Health read problem must not break training screens.
    return [];
  }
}

function fromPlanError(error: unknown): never {
  if (error instanceof WorkoutsError) throw error;
  if (error instanceof PlanStoreError) {
    const code = error.code === 'noPlan' || error.code === 'alreadyStarted' ? 'invalidState' : error.code;
    throw new WorkoutsError(code, error.skippedCount);
  }
  throw error;
}

export interface ProgramState {
  versionNumber: number;
  createdAt: number;
  state: PlanState;
}

async function readPlan(connection?: SqlConnection): Promise<ProgramState> {
  try {
    const versions = await createPlanRepository(connection).listVersions();
    if (versions.skippedCount) throw new WorkoutsError('invalidRows', versions.skippedCount);
    const current = versions.rows[0];
    if (!current) throw new WorkoutsError('notFound');
    return { versionNumber: current.number, createdAt: current.createdAt, state: current.snapshot };
  } catch (error) { return fromPlanError(error); }
}

async function loadSessions(repository: WorkoutRepository): Promise<SessionWithSets[]> {
  const sessions = await repository.listSessions({ order: 'asc' });
  const sets = await repository.listSets();
  const bySession = new Map<string, SetEntry[]>();
  for (const set of sets.rows) bySession.set(set.sessionId, [...(bySession.get(set.sessionId) ?? []), set]);
  return sessions.rows.map((session) => ({ ...session, sets: (bySession.get(session.id) ?? []).sort((a, b) => a.index - b.index || a.committedAt - b.committedAt) }));
}

function templateExerciseOf(session: WorkoutSession, templateExerciseId: string): TemplateExercise {
  const found = session.prescription.exercises.find((exercise) => exercise.id === templateExerciseId);
  if (!found) throw new WorkoutsError('invalidState');
  return found;
}

function assertLoadFits(templateExercise: TemplateExercise, loadKg: number | null) {
  if (isBodyweight(templateExercise.exerciseId) ? loadKg !== null : loadKg === null) throw new WorkoutsError('invalidState');
}

/** A swapped-in exercise starts with no history (TRN-5): same Template Exercise id + new exercise gets a new id. */
function freshIdsForSwaps(previous: TrainingProgram, next: TrainingProgram, newId: () => string): TrainingProgram {
  const exerciseById = new Map(previous.rotation.flatMap((template) => template.exercises.map((exercise) => [exercise.id, exercise.exerciseId] as const)));
  return {
    rotation: next.rotation.map((template) => ({
      ...template,
      exercises: template.exercises.map((exercise) => {
        const before = exerciseById.get(exercise.id);
        return before !== undefined && before !== exercise.exerciseId ? { ...exercise, id: `${exercise.exerciseId}-${newId()}` } : exercise;
      }),
    })),
  };
}

export function createWorkoutService(options: WorkoutServiceOptions = {}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? randomId;
  const offsetAt = options.offsetAt ?? deviceOffset;
  const healthWorkouts = options.healthWorkouts ?? defaultHealthWorkouts;
  const recordMetric = options.recordMetric ?? ((event: MetricEvent) => metrics.record(event));
  const repository = () => createWorkoutRepository(options.connection);

  const atomically = <T>(work: (repository: WorkoutRepository, tx: SqlConnection) => Promise<T>) =>
    inWorkoutTransaction(async (r, tx) => {
      const result = await work(r, tx);
      await options.beforeCommit?.();
      return result;
    }, options.connection);

  async function measure(type: 'set_logging' | 'set_edit', durationMs: number) {
    try { await recordMetric({ event_type: type, duration_ms: Math.max(0, Math.round(durationMs)) }); }
    catch { logEvent('record_failure', { errorCode: 'metricTrackingFailed' }); }
  }

  /** Rebuilds every Template Exercise's cached progression of the current program (TRN-9). */
  async function recomputeProgression(r: WorkoutRepository, program: TrainingProgram) {
    const finished = (await loadSessions(r)).filter((session) => session.endedAt !== null);
    const known = new Set<string>();
    for (const template of program.rotation) {
      for (const exercise of template.exercises) {
        known.add(exercise.id);
        const result = computeProgression(progressionPrescription(exercise), progressionHistory(finished, exercise.id));
        await r.putProgression({
          templateExerciseId: exercise.id,
          recommendedSets: (result.recommendedSets ?? []).map((set, index) => ({ index, loadKg: set.loadKg, reps: set.reps })),
          stallCounters: { failedSessionStreak: result.stall.failedSessionStreak, noRepGainStreak: result.stall.noRepGainStreak },
          sourceSessionIds: result.sessions.map((entry) => entry.sessionId),
          updatedAt: now(),
        });
      }
    }
    for (const cached of (await r.listProgression()).rows) if (!known.has(cached.templateExerciseId)) await r.deleteProgression(cached.templateExerciseId);
  }

  /** After a change to a finished session: refresh `completed`, then the progression cache. */
  async function settle(r: WorkoutRepository, tx: SqlConnection, sessionId: string) {
    const session = await r.getSession(sessionId);
    if (!session || session.endedAt === null) return;
    const sets = (await r.listSets({ sessionId })).rows;
    const completed = sets.some((set) => set.type === 'working');
    if (completed !== session.completed) await r.updateSession(sessionId, { completed });
    await recomputeProgression(r, (await readPlan(tx)).state.trainingProgram);
  }

  async function reindex(r: WorkoutRepository, sessionId: string, templateExerciseId: string) {
    const siblings = (await r.listSets({ sessionId, templateExerciseId })).rows.sort((a, b) => a.index - b.index || a.committedAt - b.committedAt);
    for (const [index, sibling] of siblings.entries()) if (sibling.index !== index) await r.updateSet(sibling.id, { index });
  }

  async function removeSet(r: WorkoutRepository, tx: SqlConnection, setId: string): Promise<SetEntry> {
    const entry = await r.getSet(setId);
    if (!entry) throw new WorkoutsError('notFound');
    await r.deleteSet(setId);
    await reindex(r, entry.sessionId, entry.templateExerciseId);
    await settle(r, tx, entry.sessionId);
    return entry;
  }

  async function restoreSet(r: WorkoutRepository, tx: SqlConnection, entry: SetEntry) {
    const siblings = (await r.listSets({ sessionId: entry.sessionId, templateExerciseId: entry.templateExerciseId })).rows
      .filter((sibling) => sibling.index >= entry.index).sort((a, b) => b.index - a.index);
    for (const sibling of siblings) await r.updateSet(sibling.id, { index: sibling.index + 1 });
    await r.insertSet(entry);
    await settle(r, tx, entry.sessionId);
  }

  // ---- Commands ----

  async function startSession(templateId: string, startOptions: { deload?: boolean } = {}): Promise<WorkoutSession> {
    return atomically(async (r, tx) => {
      const template = (await readPlan(tx)).state.trainingProgram.rotation.find((candidate) => candidate.id === templateId);
      if (!template) throw new WorkoutsError('notFound');
      const deload = startOptions.deload === true;
      const session: WorkoutSession = {
        id: newId(), templateId, startedAt: now(), endedAt: null, completed: false, deload,
        // Frozen here (PLAN-7, D7). A Deload keeps loads and halves working sets, rounded up (TRN-10).
        prescription: {
          templateName: template.name,
          exercises: template.exercises.map((exercise) => (deload ? { ...exercise, workingSets: Math.ceil(exercise.workingSets / 2) } : exercise)),
        },
      };
      await r.insertSession(session);
      return session;
    });
  }

  async function logSet(input: LogSetInput): Promise<{ set: SetEntry; undo: UndoToken }> {
    const { entry, finished } = await atomically(async (r, tx) => {
      const session = await r.getSession(input.sessionId);
      if (!session) throw new WorkoutsError('notFound');
      const templateExercise = templateExerciseOf(session, input.templateExerciseId);
      assertLoadFits(templateExercise, input.loadKg);
      const existing = (await r.listSets({ sessionId: session.id, templateExerciseId: templateExercise.id })).rows;
      const created: SetEntry = {
        id: newId(), sessionId: session.id, templateExerciseId: templateExercise.id, exerciseId: templateExercise.exerciseId,
        index: existing.length ? Math.max(...existing.map((set) => set.index)) + 1 : 0,
        type: input.type ?? 'working', loadKg: input.loadKg, reps: input.reps, committedAt: now(), editedAt: null,
      };
      await r.insertSet(created);
      if (session.endedAt !== null) await settle(r, tx, session.id);
      return { entry: created, finished: session.endedAt !== null };
    });
    // A set added to a finished session is an edit after save (§10b), not a repeat-set timing.
    await measure(finished ? 'set_edit' : 'set_logging', input.durationMs);
    return { set: entry, undo: { kind: 'deleteSet', setId: entry.id } };
  }

  async function editSet(input: EditSetInput): Promise<{ set: SetEntry }> {
    const set = await atomically(async (r, tx) => {
      const current = await r.getSet(input.setId);
      if (!current) throw new WorkoutsError('notFound');
      const session = await r.getSession(current.sessionId);
      if (!session) throw new WorkoutsError('notFound');
      const loadKg = input.loadKg === undefined ? current.loadKg : input.loadKg;
      assertLoadFits(templateExerciseOf(session, current.templateExerciseId), loadKg);
      const updated = await r.updateSet(current.id, { loadKg, reps: input.reps ?? current.reps, type: input.type ?? current.type, editedAt: now() });
      await settle(r, tx, session.id);
      return updated;
    });
    await measure('set_edit', input.durationMs ?? 0);
    return { set };
  }

  async function deleteSet(setId: string): Promise<{ undo: UndoToken }> {
    const entry = await atomically((r, tx) => removeSet(r, tx, setId));
    return { undo: { kind: 'restoreSet', entry } };
  }

  async function finishSession(sessionId: string): Promise<WorkoutSession> {
    return atomically(async (r, tx) => {
      const session = await r.getSession(sessionId);
      if (!session) throw new WorkoutsError('notFound');
      if (session.endedAt !== null) throw new WorkoutsError('invalidState');
      const sets = (await r.listSets({ sessionId })).rows;
      const finished = await r.updateSession(sessionId, { endedAt: Math.max(now(), session.startedAt), completed: sets.some((set) => set.type === 'working') });
      await recomputeProgression(r, (await readPlan(tx)).state.trainingProgram);
      return finished;
    });
  }

  async function deleteSession(sessionId: string): Promise<{ undo: UndoToken }> {
    return atomically(async (r, tx) => {
      const session = await r.getSession(sessionId);
      if (!session) throw new WorkoutsError('notFound');
      const sets = (await r.listSets({ sessionId })).rows;
      await r.deleteSession(sessionId);
      if (session.endedAt !== null) await recomputeProgression(r, (await readPlan(tx)).state.trainingProgram);
      return { undo: { kind: 'restoreSession', session, sets } as UndoToken };
    });
  }

  async function undo(token: UndoToken): Promise<void> {
    await atomically(async (r, tx) => {
      switch (token.kind) {
        case 'deleteSet':
          if (await r.getSet(token.setId)) await removeSet(r, tx, token.setId);
          return;
        case 'restoreSet':
          if (!await r.getSet(token.entry.id)) await restoreSet(r, tx, token.entry);
          return;
        case 'restoreSession':
          if (await r.getSession(token.session.id)) return;
          await r.insertSession(token.session);
          for (const set of token.sets) await r.insertSet(set);
          if (token.session.endedAt !== null) await recomputeProgression(r, (await readPlan(tx)).state.trainingProgram);
      }
    });
  }

  /**
   * One *Your edit* Plan Version per Save, none when nothing changed (D5, TRN-12), written together with
   * the progression cache refresh. Sessions already started keep their frozen prescription (PLAN-7).
   */
  async function saveProgram(changes: { trainingProgram?: TrainingProgram; weeklySessionTarget?: number }): Promise<PlanAppendResult> {
    const result = await atomically(async (r, tx) => {
      const plan = await readPlan(tx);
      const planChanges: PlanChanges = { ...changes };
      if (changes.trainingProgram) planChanges.trainingProgram = freshIdsForSwaps(plan.state.trainingProgram, changes.trainingProgram, newId);
      let appended: PlanAppendResult;
      try { appended = await appendVersionIn(tx, 'Your edit', planChanges, now()); } catch (error) { return fromPlanError(error); }
      if (appended.version) await recomputeProgression(r, appended.version.snapshot.trainingProgram);
      return appended;
    });
    planStore.notifyCommitted(result);
    return result;
  }

  // ---- Reads ----

  async function readProgram(): Promise<ProgramState> {
    return readPlan(options.connection);
  }

  /** The cheap read behind Today's Start/Resume and the Set quick-add (no Health lookup). */
  async function readToday() {
    const plan = await readPlan(options.connection);
    const sessions = await loadSessions(repository());
    return {
      active: sessions.find((session) => session.endedAt === null) ?? null,
      next: nextTemplate<SessionTemplate>(plan.state.trainingProgram.rotation, sessions),
    };
  }

  async function linking(sessions: readonly WorkoutSession[], from: number, to: number, at: number): Promise<WorkoutLinking<HealthWorkout> & { workouts: HealthWorkout[] }> {
    const workouts = await healthWorkouts({ from, to }, at);
    return { ...linkWorkouts(sessions, workouts, at), workouts };
  }

  async function readOverview(at = now()) {
    const plan = await readPlan(options.connection);
    const sessions = (await loadSessions(repository())).reverse(); // newest first
    const week = trainingWeekBounds(at, offsetAt);
    const windowFrom = at - 14 * DAY;
    const inWindow = sessions.filter((session) => (session.endedAt ?? at) >= windowFrom - DAY);
    return {
      program: plan.state.trainingProgram, weeklySessionTarget: plan.state.weeklySessionTarget,
      sessions, active: sessions.find((session) => session.endedAt === null) ?? null,
      week, completedThisWeek: completedInWeek(sessions, at, offsetAt),
      next: nextTemplate<SessionTemplate>(plan.state.trainingProgram.rotation, sessions),
      linking: await linking(inWindow, windowFrom, at, at),
    };
  }

  function exerciseProgress(session: SessionWithSets, finishedSessions: readonly SessionWithSets[], templateExercise: TemplateExercise, inclusive: boolean): ProgressionResult {
    const history = finishedSessions.filter((other) => (other.id !== session.id && other.startedAt < session.startedAt)
      || (inclusive && other.id === session.id));
    return computeProgression(progressionPrescription(templateExercise), progressionHistory(history, templateExercise.id));
  }

  /** Session with its frozen exercises and what progression recommends for each, as of this session's start. */
  async function readSession(sessionId: string) {
    const all = await loadSessions(repository());
    const session = all.find((candidate) => candidate.id === sessionId);
    if (!session) throw new WorkoutsError('notFound');
    const finished = all.filter((candidate) => candidate.endedAt !== null);
    const exercises = session.prescription.exercises.map((templateExercise) => ({
      templateExercise,
      exercise: getExerciseById(templateExercise.exerciseId) ?? null,
      bodyweight: isBodyweight(templateExercise.exerciseId),
      progression: exerciseProgress(session, finished, templateExercise, false),
      sets: session.sets.filter((set) => set.templateExerciseId === templateExercise.id),
    }));
    return { session, exercises };
  }

  async function readSummary(sessionId: string) {
    const all = await loadSessions(repository());
    const session = all.find((candidate) => candidate.id === sessionId);
    if (!session) throw new WorkoutsError('notFound');
    const finished = all.filter((candidate) => candidate.endedAt !== null);
    const lookup = (exerciseId: string) => getExerciseById(exerciseId);
    const summary: SessionSummary = summarizeSession(session, lookup);
    const previous = previousCompletedSession(session, all);
    const comparison: SessionComparison | null = compareWithPrevious(summary, previous ? summarizeSession(previous, lookup) : null);
    const outcomes: NextTimeOutcome[] = [];
    for (const templateExercise of session.prescription.exercises) {
      if (!session.sets.some((set) => set.templateExerciseId === templateExercise.id && set.type === 'working')) continue;
      const progress = exerciseProgress(session, finished, templateExercise, true);
      if (progress.outcome?.sessionId !== session.id) continue;
      outcomes.push(toNextTimeOutcome(progress.outcome, getExerciseById(templateExercise.exerciseId)?.name ?? templateExercise.exerciseId, progress.sessionCount === 1));
    }
    const neighbours = all.filter((other) => Math.abs(other.startedAt - session.startedAt) <= DAY);
    const end = session.endedAt ?? now();
    const linked = await linking(neighbours, session.startedAt - DAY, end + DAY, now());
    const link = linked.links.find((candidate) => candidate.sessionId === session.id);
    return {
      session, summary, comparison, previous, nextTime: outcomes, nextTimeLine: nextTimeLine(outcomes),
      linkedWorkout: linked.workouts.find((workout) => workout.id === link?.workoutId) ?? null,
    };
  }

  /** Every session containing the exercise, across all templates (TRN-5), newest first. */
  async function readExerciseHistory(exerciseId: string) {
    const all = (await loadSessions(repository())).reverse();
    return all.flatMap((session) => {
      const sets = session.sets.filter((set) => set.exerciseId === exerciseId);
      return sets.length ? [{ session, sets }] : [];
    });
  }

  // ---- Exposed to later slices ----

  async function programCreatedAt(): Promise<number> {
    try {
      const versions = await createPlanRepository(options.connection).listVersions();
      const first = versions.rows.at(-1);
      if (!first) throw new WorkoutsError('notFound');
      return first.createdAt;
    } catch (error) { return fromPlanError(error); }
  }

  /** Completed sessions per closed training week from the program's first week, zeros included (slice 6). */
  async function closedWeekCounts(at = now()): Promise<{ weekStartDay: string; completed: number }[]> {
    const sessions = await loadSessions(repository());
    const counts = completedCountsByWeek(sessions, offsetAt);
    const current = trainingWeekBounds(at, offsetAt);
    const weeks: { weekStartDay: string; completed: number }[] = [];
    let week: TrainingWeek = trainingWeekBounds(await programCreatedAt(), offsetAt);
    while (week.startMs < current.startMs) {
      weeks.push({ weekStartDay: week.startDay, completed: counts[week.startDay] ?? 0 });
      week = trainingWeekBounds(week.endMs, offsetAt);
    }
    return weeks;
  }

  /** Dated Stall events and non-Deload history size per Template Exercise of the current program (slice 6). */
  async function stallHistory() {
    const plan = await readPlan(options.connection);
    const all = await loadSessions(repository());
    const endedAt = new Map(all.map((session) => [session.id, session.endedAt]));
    return plan.state.trainingProgram.rotation.flatMap((template) => template.exercises.map((exercise) => {
      const result = computeProgression(progressionPrescription(exercise), progressionHistory(all, exercise.id));
      return {
        templateExerciseId: exercise.id, exerciseId: exercise.exerciseId, templateId: template.id,
        sessionCount: result.sessionCount,
        stalls: result.stall.events.map((event) => ({ sessionId: event.sessionId, kind: event.kind, at: endedAt.get(event.sessionId) ?? 0 })),
      };
    }));
  }

  /** Sessions started in the 7 days up to `at`, for the Coaching Context (slice 11). */
  async function lastSevenDays(at = now()) {
    const from = at - 7 * DAY;
    const sessions = (await loadSessions(repository())).filter((session) => session.startedAt >= from && session.startedAt <= at);
    const perSession = sessions.map((session) => ({
      sessionId: session.id, templateId: session.templateId, templateName: session.prescription.templateName,
      startedAt: session.startedAt, day: dayKey(session.startedAt, offsetAt),
      completed: session.completed, deload: session.deload, ...summarizeSession(session, getExerciseById),
    }));
    const total = summarizeSession({ sets: sessions.flatMap((session) => session.sets) }, getExerciseById);
    return { from, to: at, completedSessions: sessions.filter((session) => session.completed).length, ...total, sessions: perSession };
  }

  /** Fires when the user edits the weekly target, for Plan Change supersession (PLAN-3). */
  function onWeeklyTargetEdited(listener: (event: { from: number | null; to: number; versionNumber: number }) => void): () => void {
    return planStore.subscribe((result) => {
      const change = result.version?.diff.weeklySessionTarget;
      if (result.version?.source === 'Your edit' && change) listener({ from: change.from, to: change.to, versionNumber: result.version.number });
    });
  }

  return {
    startSession, logSet, editSet, deleteSet, finishSession, deleteSession, undo, saveProgram,
    readProgram, readToday, readOverview, readSession, readSummary, readExerciseHistory,
    programCreatedAt, closedWeekCounts, stallHistory, lastSevenDays, onWeeklyTargetEdited,
  };
}
export type WorkoutService = ReturnType<typeof createWorkoutService>;

/** The app-wide service over the open record. */
export const workoutService = createWorkoutService();
