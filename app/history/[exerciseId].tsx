import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExerciseHistoryTemplate } from '@/components/templates/ExerciseHistoryTemplate';
import { useExerciseHistory } from '@/features/workouts';

export default function ExerciseHistoryRoute() {
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const history = useExerciseHistory(exerciseId);
  return <ExerciseHistoryTemplate model={history}
    onOpenSession={(id) => router.push({ pathname: '/session/[id]/summary', params: { id } })} />;
}
