import { useLocalSearchParams, useRouter } from 'expo-router';
import { NutritionTargetTemplate } from '@/components/templates/NutritionTargetTemplate';
import { useNutritionTargetEditor } from '@/features/nutrition';

export default function NutritionTargetRoute() {
  const router = useRouter();
  const { field } = useLocalSearchParams<{ field?: string }>();
  const model = useNutritionTargetEditor(field);
  return <NutritionTargetTemplate key={model.status === 'ready' ? model.field : 'unavailable'} model={model} onDone={() => router.back()} />;
}
