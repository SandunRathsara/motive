import { useState } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { activityLevelOptions, calculateStartingPlan, defaultRatePresets, goalOptions, goalRatePresets, startingPlanInputSchema } from '@/features/nutrition';
import type { ActivityLevel, Goal, Sex } from '@/features/nutrition';
import { planKeys } from '@/features/plan';
import { profileKeys } from '@/features/profile';
import { getExerciseById, starterSessionTemplate } from '@/features/workouts';
import { queryClient } from '@/lib/query/client';
import { aboutYouSchema, onboardingFormSchema, type OnboardingDraft } from '../onboarding.schemas';
import { completeOnboarding, onboardingInputSchema, type OnboardingInput } from '../services/complete-onboarding';
import { onboardingKeys } from './query-keys';
import { useHealthPrefill } from './useHealthPrefill';

const defaults: OnboardingDraft = { sex: '', age: '', heightCm: '', weightKg: '', activityLevel: 1.3, weightOrigin: { kind: 'typed' }, goal: 'fatLoss', ratePreset: defaultRatePresets.fatLoss, weeklySessionTarget: 3 };
type TextField = 'age' | 'heightCm' | 'weightKg';
export function useOnboarding(onComplete: () => void) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [openedAt] = useState(Date.now);
  const [touched, setTouched] = useState<Partial<Record<TextField | 'sex', boolean>>>({});
  const mutation = useMutation({ mutationKey: onboardingKeys.all, mutationFn: (input: OnboardingInput) => completeOnboarding(input) }, queryClient);
  const form = useForm({ defaultValues: defaults, validators: { onSubmit: ({ value }) => {
    const parsed = onboardingFormSchema.safeParse(value);
    return parsed.success ? undefined : 'Check the highlighted inputs.';
  } }, onSubmit: async ({ value }) => {
    const input = onboardingInputSchema.parse({ ...value, age: Number(value.age), heightCm: Number(value.heightCm), weightKg: Number(value.weightKg) });
    try {
      await mutation.mutateAsync(input);
    } catch { return; }
    await Promise.all([queryClient.invalidateQueries({ queryKey: planKeys.all }), queryClient.invalidateQueries({ queryKey: profileKeys.all })]);
    await queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    onComplete();
  } });
  const values = useStore(form.store, (state) => state.values);
  const submitting = useStore(form.store, (state) => state.isSubmitting);
  const health = useHealthPrefill(step === 0, ({ weightKg, origin }) => {
    form.setFieldValue('weightKg', String(weightKg)); form.setFieldValue('weightOrigin', origin);
  });
  const parsed = aboutYouSchema.safeParse(values);
  const errorFor = (key: TextField | 'sex') => touched[key] && !parsed.success ? parsed.error.issues.find((issue) => issue.path[0] === key)?.message : undefined;
  const calculationInput = startingPlanInputSchema.safeParse({ ...values, age: Number(values.age), heightCm: Number(values.heightCm), weightKg: Number(values.weightKg) });
  const calculation = parsed.success && calculationInput.success ? calculateStartingPlan(calculationInput.data) : null;
  const next = () => {
    if (step === 0) {
      setTouched({ sex: true, age: true, heightCm: true, weightKg: true });
      if (!parsed.success) return;
      health.cancel(); setStep(1);
    } else if (step === 1) setStep(2);
  };
  const origin = values.weightOrigin;
  const ageDays = origin.kind === 'health' ? Math.max(0, Math.floor((openedAt - origin.sampleTime) / 86_400_000)) : 0;
  return {
    step, title: ['About you', 'Goal', 'Your starting plan'][step], busy: submitting,
    errorText: mutation.isError ? 'Nothing was saved. Your inputs are still here. Try Start again.' : null,
    fields: (['age', 'heightCm', 'weightKg'] as const).map((key) => ({ key, label: { age: 'Age (years)', heightCm: 'Height (cm)', weightKg: 'Weight (kg)' }[key], value: values[key], error: errorFor(key) })),
    sex: values.sex, sexError: errorFor('sex') ? 'Choose female or male for the starting estimate.' : undefined,
    activityLevel: values.activityLevel, activityOptions: activityLevelOptions,
    goal: values.goal, goalOptions, ratePreset: values.ratePreset, rateOptions: goalRatePresets[values.goal],
    weeklySessionTarget: values.weeklySessionTarget,
    health: { ...health, sourceText: origin.kind === 'health' ? `Trend Weight · ${origin.sourceName} · latest sample ${ageDays === 0 ? 'today' : `${ageDays} day${ageDays === 1 ? '' : 's'} ago`} · ${new Date(origin.sampleTime).toLocaleString()}` : null },
    plan: calculation ? {
      kcalText: String(calculation.kcalTarget), proteinText: `${calculation.proteinFloorG} g`, fatText: `${Number(calculation.fatMinimumG.toFixed(1))} g`,
      clampText: calculation.clamped ? `Your target is capped at your floor. This rate isn’t reachable at your floor.${calculation.suggestedSlowerPreset !== null ? ` Try the slower ${calculation.suggestedSlowerPreset}% per week preset.` : ''}` : null,
      programName: starterSessionTemplate.name,
      exercises: starterSessionTemplate.exercises.map((exercise) => ({ id: exercise.id, name: getExerciseById(exercise.exerciseId)!.name, prescription: `${exercise.workingSets} × ${exercise.repRange.min}–${exercise.repRange.max}` })),
    } : null,
    setText: (key: TextField, value: string) => {
      if (key === 'weightKg') { health.cancel(); form.setFieldValue('weightOrigin', { kind: 'typed' }); }
      form.setFieldValue(key, value);
    },
    blur: (key: TextField) => setTouched((previous) => ({ ...previous, [key]: true })),
    chooseSex: (sex: Sex) => form.setFieldValue('sex', sex),
    chooseActivity: (value: ActivityLevel) => form.setFieldValue('activityLevel', value),
    chooseGoal: (goal: Goal) => { form.setFieldValue('goal', goal); form.setFieldValue('ratePreset', defaultRatePresets[goal]); },
    chooseRate: (rate: number) => form.setFieldValue('ratePreset', rate),
    changeSessions: (delta: -1 | 1) => form.setFieldValue('weeklySessionTarget', (previous) => Math.max(1, Math.min(6, previous + delta))),
    next, back: () => { if (!submitting && step > 0) setStep(step === 2 ? 1 : 0); },
    start: async () => { if (step === 2 && parsed.success && !submitting) await form.handleSubmit(); },
  };
}
export type OnboardingViewModel = ReturnType<typeof useOnboarding>;
