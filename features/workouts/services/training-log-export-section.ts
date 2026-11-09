import type { ExportSection } from '@/lib/contracts/export-section';
import { toIsoWithOffset } from '@/lib/utils/time';
import { createWorkoutRepository } from './workout-repository';

/**
 * Sessions, set entries and the (rebuildable) progression cache. Rest overrides and increments ride in
 * the plan section's Training Program and in each session's prescription snapshot. Health links are derived on
 * read (SIG-9), never stored, so they are not exported.
 */
export const trainingLogExportSection: ExportSection = {
  key: 'trainingLog', version: 1, owner: 'workouts',
  tables: ['workout_session', 'set_entry', 'progression_cache'],
  async read(tx) {
    const repository = createWorkoutRepository(tx);
    const sessions = await repository.listSessions({ order: 'asc' });
    const sets = await repository.listSets();
    const progression = await repository.listProgression();
    return {
      records: [
        ...sessions.rows.map(({ startedAt, endedAt, ...session }) => ({
          kind: 'session' as const, ...session,
          startedAt: toIsoWithOffset(startedAt), endedAt: endedAt === null ? null : toIsoWithOffset(endedAt),
        })),
        ...sets.rows.map(({ committedAt, editedAt, ...entry }) => ({
          kind: 'set' as const, ...entry,
          committedAt: toIsoWithOffset(committedAt), editedAt: editedAt === null ? null : toIsoWithOffset(editedAt),
        })),
        ...progression.rows.map(({ updatedAt, ...entry }) => ({
          kind: 'progression' as const, ...entry, updatedAt: toIsoWithOffset(updatedAt),
        })),
      ],
      skippedCount: sessions.skippedCount + sets.skippedCount + progression.skippedCount,
    };
  },
};
