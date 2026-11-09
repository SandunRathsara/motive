import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ExerciseHistoryViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { ExerciseHistory } from '@/components/organisms/ExerciseHistory';

export function ExerciseHistoryTemplate({ model, onOpenSession }: { model: ExerciseHistoryViewModel; onOpenSession: (sessionId: string) => void }) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-6 p-6">
        {model.status === 'loading' && <Text accessibilityLiveRegion="polite" className="text-lg text-muted">Loading history…</Text>}
        {model.status === 'error' && <View className="gap-3">
          <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read this history. Your record hasn’t been changed.</Text>
          <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
        </View>}
        {model.status === 'ready' && <ExerciseHistory content={model} onOpenSession={onOpenSession} />}
      </ScrollView>
    </SafeAreaView>
  );
}
