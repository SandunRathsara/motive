import type { ExportSection } from '@/lib/contracts/export-section';
import { planExportSection } from '@/features/plan';
import { readExerciseLibrary, type TrainingProgram } from '@/features/workouts';

/** Data composition may resolve both domains; plan never depends on workouts. */
export const resolvedPlanExportSection: ExportSection = {
  ...planExportSection,
  async read(tx) {
    const plan = await planExportSection.read(tx);
    const library = await readExerciseLibrary(tx);
    const byId = new Map(library.rows.map((exercise) => [exercise.id, exercise]));
    const records: unknown[] = [];
    let skippedCount = plan.skippedCount;
    for (const record of plan.records) {
      if (record.kind === 'startingEstimate') { records.push(record); continue; }
      let unresolved = false;
      const resolveProgram = (program: TrainingProgram) => ({
        ...program,
        rotation: program.rotation.map((template) => ({
          ...template,
          exercises: template.exercises.map((exercise) => {
            const entry = byId.get(exercise.exerciseId);
            if (!entry) unresolved = true;
            return { ...exercise, name: entry?.name ?? null, libraryVersion: entry?.libraryVersion ?? null };
          }),
        })),
      });
      const snapshot = { ...record.snapshot, trainingProgram: resolveProgram(record.snapshot.trainingProgram) };
      const change = record.diff.trainingProgram;
      const diff = { ...record.diff, ...(change ? { trainingProgram: {
        from: change.from ? resolveProgram(change.from) : null, to: resolveProgram(change.to),
      } } : {}) };
      // Count a version once, even if several snapshot/diff references cannot resolve.
      if (unresolved) skippedCount++;
      else records.push({ ...record, snapshot, diff });
    }
    // Invalid library rows are counted by their owning exerciseLibrary section only.
    return { records, skippedCount };
  },
};
