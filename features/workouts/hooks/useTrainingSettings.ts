import { useCallback } from 'react';
import { plural } from '../workouts.format';
import { toLoadable, workoutErrorText, type Loadable } from '../workouts.view-models';
import { useProgramQuery, useSaveProgram } from './shared';

export type TrainingSettingsViewModel = Loadable<{
  weeklyTarget: number;
  /** "3 sessions". */
  weeklyTargetText: string;
  /** "Full Body · 5 exercises" or "3 templates". */
  programText: string;
}>;

/** Settings rows for the weekly target and the Training Program (DATA-9). */
export function useTrainingSettings() {
  const query = useProgramQuery();
  const mutation = useSaveProgram();
  const model: TrainingSettingsViewModel = toLoadable(query, ({ state }) => {
    const { rotation } = state.trainingProgram;
    return {
      weeklyTarget: state.weeklySessionTarget, weeklyTargetText: plural(state.weeklySessionTarget, 'session'),
      programText: rotation.length === 1 ? `${rotation[0].name} · ${plural(rotation[0].exercises.length, 'exercise')}` : plural(rotation.length, 'template'),
    };
  });
  const setWeeklyTarget = useCallback(async (value: number): Promise<boolean> => {
    try { await mutation.mutateAsync({ weeklySessionTarget: value }); return true; } catch { return false; }
  }, [mutation]);
  return { model, setWeeklyTarget, errorText: workoutErrorText(mutation.error) };
}
