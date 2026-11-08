import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HealthSignalType, SignalsViewModel } from '@/features/health/health.types';
import { ActionButton } from '@/components/atoms/ActionButton';
import { HealthWorkoutsList } from '@/components/organisms/HealthWorkoutsList';
import { SignalRow } from '@/components/organisms/SignalRow';

export type SignalsTemplateProps = {
  model: SignalsViewModel;
  refreshing: boolean;
  connecting?: boolean;
  feedbackText?: string;
  onRefresh: () => void;
  onConnect: () => void;
  onOpenSignal: (type: HealthSignalType) => void;
};

export function SignalsTemplate({ model, refreshing, connecting, feedbackText, onRefresh, onConnect, onOpenSignal }: SignalsTemplateProps) {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView testID="signals-list" className="flex-1 bg-bg" contentContainerClassName="gap-6 p-6 pb-10"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl testID="signals-refresh-control" accessibilityLabel="Refresh Health Signals"
          refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text accessibilityRole="header" className="text-3xl font-semibold text-text">Health Signals</Text>
        <Text className="text-base text-muted">{model.lastSyncText}</Text>
        {feedbackText && <Text accessibilityLiveRegion="polite" className="text-base text-muted">{feedbackText}</Text>}
        {model.signals.map((signal) => <SignalRow key={signal.type} model={signal} onPress={() => onOpenSignal(signal.type)} />)}
        <HealthWorkoutsList workouts={model.workouts} />
      </ScrollView>
      {model.connectionState === 'notRequested' && <View className="border-t border-line-soft bg-bg p-6">
        <ActionButton label={connecting ? 'Connecting Apple Health…' : 'Connect Apple Health'} disabled={connecting} onPress={onConnect} />
      </View>}
    </SafeAreaView>
  );
}
