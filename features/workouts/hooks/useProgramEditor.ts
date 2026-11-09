import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planKeys } from '@/features/plan';
import { workoutService } from '../services/workout-service';
import { exerciseLibrary } from '../workouts.content';
import { validateProgramDraft, type ProgramDraft, type ProgramDraftValidation } from '../workouts.program';
import type { ExerciseLibraryEntry } from '../workouts.schemas';
import { workoutErrorText } from '../workouts.view-models';
import { workoutKeys } from './query-keys';

export type ProgramEditorViewModel =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | {
    status: 'ready';
    /** "Plan v3" — the version the draft starts from. */
    versionLabel: string;
    draft: ProgramDraft;
    library: readonly ExerciseLibraryEntry[];
    weeklyTargetOptions: readonly number[];
  };

export type SaveProgramResult =
  | { saved: true; /** False when nothing changed, so no Plan Version was written. */ changed: boolean }
  | { saved: false; validation: ProgramDraftValidation | null };

/** S6: edit templates, exercises, sets, rep ranges, increments, rotation order and the weekly target. One Save = one Plan Version (D5). */
export function useProgramEditor() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: workoutKeys.program, queryFn: () => workoutService.readProgram() });
  const mutation = useMutation({
    mutationKey: workoutKeys.saveProgram,
    mutationFn: (draft: ProgramDraft) => workoutService.saveProgram(draft),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: workoutKeys.all }), client.invalidateQueries({ queryKey: planKeys.all })]);
    },
  });
  const model: ProgramEditorViewModel = query.isPending ? { status: 'loading' }
    : query.isError ? { status: 'error', retry: () => { void query.refetch(); } }
      : {
        status: 'ready', versionLabel: `Plan v${query.data.versionNumber}`,
        draft: { weeklySessionTarget: query.data.state.weeklySessionTarget, trainingProgram: query.data.state.trainingProgram },
        library: exerciseLibrary, weeklyTargetOptions: [1, 2, 3, 4, 5, 6],
      };
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
