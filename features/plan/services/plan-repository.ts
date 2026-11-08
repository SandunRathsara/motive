import { parseRows, requireRecord, type SqlConnection } from '@/lib/persistence';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { z } from 'zod';
import { planFieldSchema, planStateSchema, planVersionSchema, planVersionRowSchema, startingEstimateSchema, startingEstimateRowSchema, type PlanState, type PlanVersion, type PlanDiff, type StartingEstimate } from '../plan.schemas';

export class PlanStoreError extends Error {
  constructor(readonly code: 'invalidState' | 'invalidRows' | 'noPlan' | 'alreadyStarted' | 'recordWritesBlocked' | 'readFailed' | 'writeFailed', readonly skippedCount = 0) { super(code); this.name = 'PlanStoreError'; }
}
export function assertPlanWritesAllowed() {
  if (!recordWritesAllowed()) throw new PlanStoreError('recordWritesBlocked');
}
export function planDiff(previous: PlanState | null, next: PlanState): PlanDiff {
  const diff: PlanDiff = {};
  for (const field of planFieldSchema.options) {
    if (!previous || JSON.stringify(previous[field]) !== JSON.stringify(next[field])) {
      Object.assign(diff, { [field]: { from: previous?.[field] ?? null, to: next[field] } });
    }
  }
  return diff;
}
const exerciseIdRowSchema = z.object({ id: z.string().min(1) }).strict();
export function createPlanRepository(connection?: SqlConnection) {
  const db = () => connection ?? requireRecord();
  const repository = {
    async listVersions() {
      try { return parseRows(planVersionRowSchema, await db().getAll('SELECT * FROM plan_version ORDER BY number DESC')); }
      catch { throw new PlanStoreError('readFailed'); }
    },
    async readStartingEstimate() {
      try {
        const result = parseRows(startingEstimateRowSchema, await db().getAll('SELECT * FROM starting_estimate ORDER BY id'));
        return { ...result, estimate: result.rows[0] ?? null };
      } catch { throw new PlanStoreError('readFailed'); }
    },
    async insertStartingEstimate(input: StartingEstimate) {
      assertPlanWritesAllowed();
      const parsed = startingEstimateSchema.safeParse(input);
      if (!parsed.success) throw new PlanStoreError('invalidState');
      try { await db().run('INSERT INTO starting_estimate VALUES (1, ?, ?)', [parsed.data.valueKcal, parsed.data.createdAt]); }
      catch { throw new PlanStoreError('writeFailed'); }
    },
    async insertVersion(input: PlanVersion) {
      assertPlanWritesAllowed();
      const parsed = planVersionSchema.safeParse(input);
      if (!parsed.success) throw new PlanStoreError('invalidState');
      const version = parsed.data;
      try {
        const references = parseRows(exerciseIdRowSchema, await db().getAll('SELECT id FROM exercise_library'));
        if (references.skippedCount) throw new PlanStoreError('invalidRows', references.skippedCount);
        const ids = new Set(references.rows.map((row) => row.id));
        if (version.snapshot.trainingProgram.rotation.some((template) => template.exercises.some((exercise) => !ids.has(exercise.exerciseId)))) throw new PlanStoreError('invalidState');
        assertPlanWritesAllowed();
        await db().run('INSERT INTO plan_version VALUES (?, ?, ?, ?, ?, ?)', [version.number, version.createdAt, version.source, version.sourceRef, JSON.stringify(version.snapshot), JSON.stringify(version.diff)]);
      } catch (error) {
        if (error instanceof PlanStoreError) throw error;
        throw new PlanStoreError('writeFailed');
      }
    },
    async insertInitial(input: PlanState, createdAt: number): Promise<PlanVersion> {
      assertPlanWritesAllowed();
      const existing = await repository.listVersions();
      if (existing.skippedCount) throw new PlanStoreError('invalidRows', existing.skippedCount);
      if (existing.rows.length) throw new PlanStoreError('alreadyStarted');
      const parsed = planStateSchema.safeParse(input);
      if (!parsed.success) throw new PlanStoreError('invalidState');
      const version: PlanVersion = { number: 1, createdAt, source: 'Starting plan', sourceRef: null, snapshot: parsed.data, diff: planDiff(null, parsed.data) };
      await repository.insertVersion(version);
      return version;
    },
  };
  return repository;
}
