import { useForm, useStore } from '@tanstack/react-form';
import { useCurrentPlan } from '@/features/plan';
import { defaultRatePresets, goalOptions, goalRatePresets, type Goal, type GoalSelection } from '../nutrition.types';
import { goalSelectionSchema } from '../nutrition.schemas';
import { useEditGoal, useEditKcalTarget, useEditProteinFloor } from './useNutritionEdits';

export type NutritionTargetEditorModel = {
  status: 'loading' | 'ready' | 'error';
  field: 'goal' | 'kcal' | 'protein';
  label: string;
  initialValue: string;
  busy: boolean;
  saved: boolean;
  errorText?: string;
  noticeText?: string;
  saveValue: (value: string) => void;
  reset: () => void;
  retry: () => void;
  goal: {
    value: Goal;
    rate: GoalSelection['ratePreset'];
    options: readonly { value: Goal; label: string }[];
    rates: { value: Exclude<GoalSelection['ratePreset'], null>; label: string }[];
    selectGoal: (goal: Goal) => void;
    selectRate: (rate: Exclude<GoalSelection['ratePreset'], null>) => void;
    save: () => void;
  };
};

export function useNutritionTargetEditor(input: string | string[] | undefined): NutritionTargetEditorModel {
  const field = input === 'goal' || input === 'protein' ? input : 'kcal';
  const query = useCurrentPlan();
  const state = query.data?.status === 'present' ? query.data.version?.snapshot : undefined;
  const goalEdit = useEditGoal();
  const kcalEdit = useEditKcalTarget();
  const proteinEdit = useEditProteinFloor();
  const edit = field === 'goal' ? goalEdit : field === 'kcal' ? kcalEdit : proteinEdit;
  const form = useForm({
    defaultValues: { goal: state?.goal ?? 'fatLoss', ratePreset: state ? state.ratePreset : -0.5 },
    onSubmit: ({ value }) => {
      const parsed = goalSelectionSchema.safeParse(value);
      if (parsed.success) goalEdit.mutate(parsed.data);
    },
  });
  const values = useStore(form.store, (state) => state.values);
  return {
    status: query.isPending ? 'loading' : query.isError || !state ? 'error' : 'ready',
    field, label: field === 'goal' ? 'Goal & rate preset' : field === 'kcal' ? 'kcal target' : 'Protein floor',
    initialValue: state ? String(field === 'protein' ? state.proteinFloorG : state.kcalTarget) : '',
    busy: edit.isPending, saved: edit.isSuccess, errorText: edit.errorText,
    noticeText: field === 'goal' ? goalEdit.noticeText : undefined,
    reset: edit.reset, retry: () => { void query.refetch(); },
    saveValue: (text) => {
      const value = /^\d+$/.test(text.trim()) ? Number(text) : NaN;
      if (field === 'protein') proteinEdit.mutate(value);
      else kcalEdit.mutate(value);
    },
    goal: {
      value: values.goal, rate: values.ratePreset, options: goalOptions,
      rates: goalRatePresets[values.goal].map((value) => ({ value, label: `${value > 0 ? '+' : '−'}${Math.abs(value)}%` })),
      selectGoal: (goal) => { goalEdit.reset(); form.setFieldValue('goal', goal); form.setFieldValue('ratePreset', defaultRatePresets[goal]); },
      selectRate: (rate) => { goalEdit.reset(); form.setFieldValue('ratePreset', rate); },
      save: () => { void form.handleSubmit(); },
    },
  };
}
