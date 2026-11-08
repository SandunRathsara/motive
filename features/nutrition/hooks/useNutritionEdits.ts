import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planKeys } from '@/features/plan';
import { nutritionEdits, NutritionEditError } from '../services/nutrition-edits';

export function useEditGoal() {
  const client = useQueryClient();
  const mutation = useMutation({ mutationKey: planKeys.editGoal, mutationFn: nutritionEdits.editGoal,
    onSuccess: () => client.invalidateQueries({ queryKey: planKeys.all }),
  });
  const data = mutation.data;
  const slower = data?.suggestedSlowerPreset;
  return { ...mutation, errorText: editErrorText(mutation.error), noticeText: data?.clamped && data.floor
    ? `This rate is not reachable at your floor of ${Math.ceil(data.floor.kcal).toLocaleString()} kcal. Your target was capped at the floor.${slower === null ? ' No slower preset is available for this Goal.' : ` Try ${String(slower).replace('-', '−')}% per week, a slower preset.`}`
    : undefined };
}

function editErrorText(error: Error | null) {
  if (!error) return undefined;
  if (error instanceof NutritionEditError) {
    if (error.code === 'invalidInput') return 'Enter a positive whole number.';
    if (error.code === 'belowFloor' && error.floor) {
      const reason = error.floor.reason === 'bmr' ? 'BMR at your reference weight' : 'the minimum for your sex';
      return `Your floor is ${Math.ceil(error.floor.kcal).toLocaleString()} kcal, based on ${reason}. Enter at least this amount. Nothing was saved.`;
    }
  }
  return "Couldn't save your edit. Nothing was saved. Try again.";
}

export function useEditKcalTarget() {
  const client = useQueryClient();
  const mutation = useMutation({ mutationKey: planKeys.editKcalTarget, mutationFn: nutritionEdits.editKcalTarget,
    onSuccess: () => client.invalidateQueries({ queryKey: planKeys.all }),
  });
  return { ...mutation, errorText: editErrorText(mutation.error) };
}

export function useEditProteinFloor() {
  const client = useQueryClient();
  const mutation = useMutation({ mutationKey: planKeys.editProteinFloor, mutationFn: nutritionEdits.editProteinFloor,
    onSuccess: () => client.invalidateQueries({ queryKey: planKeys.all }),
  });
  return { ...mutation, errorText: editErrorText(mutation.error) };
}
