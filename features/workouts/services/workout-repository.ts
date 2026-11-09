import { z } from 'zod';
import { parseRows, requireRecord, type SqlConnection, type SqlExecutor, type SqlValue } from '@/lib/persistence';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { WorkoutsError } from '../workouts.errors';
import {
  progressionCacheEntrySchema, progressionCacheRowSchema, setEntryRowSchema, setEntrySchema, workoutSessionRowSchema, workoutSessionSchema,
  type ProgressionCacheEntry, type SetEntry, type WorkoutSession,
} from '../workouts.schemas';

export interface SessionFilter {
  templateId?: string;
  status?: 'active' | 'finished';
  /** Inclusive lower bound on started_at. */
  startedFromMs?: number;
  /** Exclusive upper bound on started_at. */
  startedBeforeMs?: number;
  /** Default `desc` (newest first). */
  order?: 'asc' | 'desc';
}

export interface SetFilter {
  sessionId?: string;
  sessionIds?: readonly string[];
  templateExerciseId?: string;
  exerciseId?: string;
  /** Inclusive lower bound on committed_at. */
  committedFromMs?: number;
  /** Exclusive upper bound on committed_at. */
  committedBeforeMs?: number;
}

export type SessionPatch = Partial<Pick<WorkoutSession, 'endedAt' | 'completed' | 'deload'>>;
export type SetPatch = Partial<Pick<SetEntry, 'index' | 'type' | 'loadKg' | 'reps' | 'editedAt'>>;

export function assertWorkoutWritesAllowed() {
  if (!recordWritesAllowed()) throw new WorkoutsError('recordWritesBlocked');
}

const addClause = (clauses: string[], params: SqlValue[], sql: string, value: SqlValue | undefined) => {
  if (value === undefined) return;
  clauses.push(sql); params.push(value);
};
const where = (clauses: readonly string[]) => (clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '');

/**
 * Plain data access over the training-log tables. Every write is validated first; reads validate rows
 * (lists skip and count invalid ones, single reads throw `invalidRows`). It owns no business rules:
 * start/log/finish/recompute orchestration belongs to the service, which composes these inside
 * {@link inWorkoutTransaction}.
 */
export function createWorkoutRepository(connection?: SqlConnection) {
  const db = () => connection ?? requireRecord();
  const read = async <T>(work: () => Promise<T>): Promise<T> => {
    try { return await work(); } catch (error) {
      if (error instanceof WorkoutsError) throw error;
      throw new WorkoutsError('readFailed');
    }
  };
  const write = async <T>(work: () => Promise<T>): Promise<T> => {
    assertWorkoutWritesAllowed();
    try { return await work(); } catch (error) {
      if (error instanceof WorkoutsError) throw error;
      throw new WorkoutsError('writeFailed');
    }
  };
  const valid = <T>(schema: z.ZodType<T>, input: unknown): T => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new WorkoutsError('invalidState');
    return parsed.data;
  };
  const one = <T>(schema: z.ZodType<T>, raw: unknown): T | null => {
    if (raw === null || raw === undefined) return null;
    const { rows, skippedCount } = parseRows(schema, [raw]);
    if (skippedCount) throw new WorkoutsError('invalidRows', skippedCount);
    return rows[0] ?? null;
  };

  const repository = {
    async getSession(id: string): Promise<WorkoutSession | null> {
      return read(async () => one(workoutSessionRowSchema, await db().getFirst('SELECT * FROM workout_session WHERE id = ?', [id])));
    },
    async findActiveSession(): Promise<WorkoutSession | null> {
      return read(async () => one(workoutSessionRowSchema, await db().getFirst('SELECT * FROM workout_session WHERE ended_at IS NULL')));
    },
    async listSessions(filter: SessionFilter = {}) {
      return read(async () => {
        const clauses: string[] = []; const params: SqlValue[] = [];
        addClause(clauses, params, 'template_id = ?', filter.templateId);
        if (filter.status === 'active') clauses.push('ended_at IS NULL');
        if (filter.status === 'finished') clauses.push('ended_at IS NOT NULL');
        addClause(clauses, params, 'started_at >= ?', filter.startedFromMs);
        addClause(clauses, params, 'started_at < ?', filter.startedBeforeMs);
        const direction = filter.order === 'asc' ? 'ASC' : 'DESC';
        return parseRows(workoutSessionRowSchema, await db().getAll(
          `SELECT * FROM workout_session${where(clauses)} ORDER BY started_at ${direction}, id ${direction}`, params,
        ));
      });
    },
    /** At most one session may be active; a second is `activeSessionExists`. */
    async insertSession(input: WorkoutSession): Promise<void> {
      const session = valid(workoutSessionSchema, input);
      return write(async () => {
        if (session.endedAt === null && await db().getFirst('SELECT id FROM workout_session WHERE ended_at IS NULL')) {
          throw new WorkoutsError('activeSessionExists');
        }
        await db().run(
          'INSERT INTO workout_session (id, template_id, started_at, ended_at, completed, deload, prescription_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [session.id, session.templateId, session.startedAt, session.endedAt, session.completed ? 1 : 0, session.deload ? 1 : 0, JSON.stringify(session.prescription)],
        );
      });
    },
    async updateSession(id: string, patch: SessionPatch): Promise<WorkoutSession> {
      return write(async () => {
        const current = one(workoutSessionRowSchema, await db().getFirst('SELECT * FROM workout_session WHERE id = ?', [id]));
        if (!current) throw new WorkoutsError('notFound');
        const next = valid(workoutSessionSchema, { ...current, ...patch });
        await db().run('UPDATE workout_session SET ended_at = ?, completed = ?, deload = ? WHERE id = ?',
          [next.endedAt, next.completed ? 1 : 0, next.deload ? 1 : 0, id]);
        return next;
      });
    },
    /** Removes the session and its set entries. Returns false when it did not exist. */
    async deleteSession(id: string): Promise<boolean> {
      return write(async () => {
        await db().run('DELETE FROM set_entry WHERE session_id = ?', [id]);
        return (await db().getFirst('DELETE FROM workout_session WHERE id = ? RETURNING id', [id])) !== null;
      });
    },

    async getSet(id: string): Promise<SetEntry | null> {
      return read(async () => one(setEntryRowSchema, await db().getFirst('SELECT * FROM set_entry WHERE id = ?', [id])));
    },
    /** Chronological by commit time. */
    async listSets(filter: SetFilter = {}) {
      return read(async () => {
        const clauses: string[] = []; const params: SqlValue[] = [];
        addClause(clauses, params, 'session_id = ?', filter.sessionId);
        if (filter.sessionIds) {
          if (!filter.sessionIds.length) return { rows: [] as SetEntry[], skippedCount: 0 };
          clauses.push(`session_id IN (${filter.sessionIds.map(() => '?').join(', ')})`);
          params.push(...filter.sessionIds);
        }
        addClause(clauses, params, 'template_exercise_id = ?', filter.templateExerciseId);
        addClause(clauses, params, 'exercise_id = ?', filter.exerciseId);
        addClause(clauses, params, 'committed_at >= ?', filter.committedFromMs);
        addClause(clauses, params, 'committed_at < ?', filter.committedBeforeMs);
        return parseRows(setEntryRowSchema, await db().getAll(
          `SELECT * FROM set_entry${where(clauses)} ORDER BY committed_at ASC, set_index ASC, id ASC`, params,
        ));
      });
    },
    async insertSet(input: SetEntry): Promise<void> {
      const entry = valid(setEntrySchema, input);
      return write(async () => {
        if (!await db().getFirst('SELECT id FROM workout_session WHERE id = ?', [entry.sessionId])) throw new WorkoutsError('notFound');
        await db().run(
          'INSERT INTO set_entry (id, session_id, template_exercise_id, exercise_id, set_index, type, load_kg, reps, committed_at, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [entry.id, entry.sessionId, entry.templateExerciseId, entry.exerciseId, entry.index, entry.type, entry.loadKg, entry.reps, entry.committedAt, entry.editedAt],
        );
      });
    },
    async updateSet(id: string, patch: SetPatch): Promise<SetEntry> {
      return write(async () => {
        const current = one(setEntryRowSchema, await db().getFirst('SELECT * FROM set_entry WHERE id = ?', [id]));
        if (!current) throw new WorkoutsError('notFound');
        const next = valid(setEntrySchema, { ...current, ...patch });
        await db().run('UPDATE set_entry SET set_index = ?, type = ?, load_kg = ?, reps = ?, edited_at = ? WHERE id = ?',
          [next.index, next.type, next.loadKg, next.reps, next.editedAt, id]);
        return next;
      });
    },
    async deleteSet(id: string): Promise<boolean> {
      return write(async () => (await db().getFirst('DELETE FROM set_entry WHERE id = ? RETURNING id', [id])) !== null);
    },

    async getProgression(templateExerciseId: string): Promise<ProgressionCacheEntry | null> {
      return read(async () => one(progressionCacheRowSchema, await db().getFirst('SELECT * FROM progression_cache WHERE template_exercise_id = ?', [templateExerciseId])));
    },
    async listProgression() {
      return read(async () => parseRows(progressionCacheRowSchema, await db().getAll('SELECT * FROM progression_cache ORDER BY template_exercise_id')));
    },
    /** Insert or replace the single cache row of a Template Exercise. */
    async putProgression(input: ProgressionCacheEntry): Promise<void> {
      const entry = valid(progressionCacheEntrySchema, input);
      return write(async () => {
        await db().run(
          `INSERT INTO progression_cache (template_exercise_id, recommended_sets_json, stall_json, source_session_ids_json, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(template_exercise_id) DO UPDATE SET recommended_sets_json = excluded.recommended_sets_json,
  stall_json = excluded.stall_json, source_session_ids_json = excluded.source_session_ids_json, updated_at = excluded.updated_at`,
          [entry.templateExerciseId, JSON.stringify(entry.recommendedSets), JSON.stringify(entry.stallCounters), JSON.stringify(entry.sourceSessionIds), entry.updatedAt],
        );
      });
    },
    async deleteProgression(templateExerciseId: string): Promise<void> {
      return write(async () => { await db().run('DELETE FROM progression_cache WHERE template_exercise_id = ?', [templateExerciseId]); });
    },
    async clearProgression(): Promise<void> {
      return write(async () => { await db().run('DELETE FROM progression_cache'); });
    },
  };
  return repository;
}
export type WorkoutRepository = ReturnType<typeof createWorkoutRepository>;

/**
 * One atomic unit. The callback receives a repository bound to the transaction connection and that
 * connection itself, so other features' repositories (for example the plan store) can join the same
 * transaction. Nested transactions are unsupported. Any failure rolls everything back and surfaces as
 * a typed `WorkoutsError`; nothing is observable as saved before the callback resolves.
 */
export async function inWorkoutTransaction<T>(
  work: (repository: WorkoutRepository, tx: SqlConnection) => Promise<T>,
  executor?: SqlExecutor,
): Promise<T> {
  assertWorkoutWritesAllowed();
  try {
    return await Promise.resolve().then(() => (executor ?? requireRecord()).transaction(async (tx) => {
      assertWorkoutWritesAllowed();
      return work(createWorkoutRepository(tx), tx);
    }));
  } catch (error) {
    if (error instanceof WorkoutsError) throw error;
    throw new WorkoutsError('writeFailed');
  }
}
