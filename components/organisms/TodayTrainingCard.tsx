import { Text, View } from 'react-native';
import type { TodayTrainingViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { InlineNotice } from '@/components/atoms/InlineNotice';

/** Today's training card (TODAY-1): Start the next template, or Resume the session in progress. */
export function TodayTrainingCard({ model, busy = false, errorText, onOpen }: {
  model: TodayTrainingViewModel;
  busy?: boolean;
  errorText?: string;
  onOpen: () => void;
}) {
  return (
    <View className="gap-4 rounded-lg border border-line-soft bg-surface p-6">
      <Text accessibilityRole="header" className="text-xl font-semibold text-text">Training</Text>
      {model.status === 'loading' && <Text accessibilityLiveRegion="polite" className="text-lg text-muted">Loading your training…</Text>}
      {model.status === 'error' && <>
        <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your training. Your record hasn’t been changed.</Text>
        <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
      </>}
      {model.status === 'ready' && <>
        <View className="gap-1">
          <Text selectable className="text-3xl font-semibold text-text">{model.title}</Text>
          <Text className="text-base text-muted">{model.detail}</Text>
        </View>
        {model.action !== 'none' && <ActionButton label={model.buttonLabel} accessibilityLabel={model.accessibilityLabel}
          disabled={busy} onPress={onOpen} />}
        <InlineNotice text={errorText} error />
      </>}
    </View>
  );
}
