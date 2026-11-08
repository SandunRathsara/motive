import { Text, View } from 'react-native';
import type { HealthWorkoutViewModel } from '@/features/health/health.types';

export function HealthWorkoutsList({ workouts }: { workouts: readonly HealthWorkoutViewModel[] }) {
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-xl font-semibold text-text">Recent Health workouts</Text>
      {workouts.length === 0 && <Text className="text-base text-muted">No cached Health workouts yet.</Text>}
      {workouts.map((workout) => (
        <View key={workout.id} accessible accessibilityRole="text"
          accessibilityLabel={`${workout.activityName} · ${workout.timeText} · ${workout.durationText}`}
          className="gap-1 rounded-md bg-surface p-4">
          <Text className="text-lg text-text">{workout.activityName}</Text>
          <Text className="text-base text-muted">{workout.timeText} · {workout.durationText}</Text>
        </View>
      ))}
    </View>
  );
}
