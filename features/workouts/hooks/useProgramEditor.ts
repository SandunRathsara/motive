import { useCallback } from 'react';
import { exerciseLibrary } from '../workouts.content';
import { validateProgramDraft, type ProgramDraft, type ProgramDraftValidation } from '../workouts.program';
import type { ExerciseLibraryEntry } from '../workouts.schemas';
import { toLoadable, workoutErrorText, type Loadable } from '../workouts.view-models';
import { useProgramQuery, useSaveProgram } from './shared';

export type ProgramEditorViewModel = Loadable<{
  /** "Plan v3" — the version the draft starts from. */
  versionLabel: string;
  draft: ProgramDraft;
  library: readonly ExerciseLibraryEntry[];
  weeklyTargetOptions: readonly number[];
}>;

export type SaveProgramResult =
  | { saved: true; /** False when nothing changed, so no Plan Version was written. */ changed: boolean }
  | { saved: false; validation: ProgramDraftValidation | null };

/** S6: edit templates, exercises, sets, rep ranges, increments, rotation order and the weekly target. One Save = one Plan Version (D5). */
export function useProgramEditor() {
  const query = useProgramQuery();
  const mutation = useSaveProgram();
  const model: ProgramEditorViewModel = toLoadable(query, (program) => ({
    versionLabel: `Plan v${program.versionNumber}`,
    draft: { weeklySessionTarget: program.state.weeklySessionTarget, trainingProgram: program.state.trainingProgram },
    library: exerciseLibrary, weeklyTargetOptions: [1, 2, 3, 4, 5, 6],
  }));
  const save = useCallback(async (draft: ProgramDraft): Promise<SaveProgramResult> => {
    const validation = validateProgramDraft(draft);
    if (!validation.valid) return { saved: false, validation };
    try {
      const result = await mutation.mutateAsync(draft);
      return { saved: true, changed: result.version !== null };
    } catch { return { saved: false, validation: null }; }
  }, [mutation]);
  return { model, save, saving: mutation.isPending, errorText: workoutErrorText(mutation.error) };
}
