import { ScrollView, Text } from 'react-native';
import { ActionButton } from '@/components/atoms/ActionButton';

export function HealthReadStateTemplate({ title, failed, onRetry }: {
  title: string;
  failed: boolean;
  onRetry: () => void;
}) {
  return <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 p-6 pb-10">
    <Text accessibilityRole="header" className="text-3xl font-semibold text-text">{title}</Text>
    <Text accessibilityLiveRegion="polite" className="text-lg text-muted">{failed
      ? `Couldn’t load cached ${title}. Your record has not been changed.` : `Loading cached ${title}…`}</Text>
    {failed && <ActionButton label="Retry" onPress={onRetry} />}
  </ScrollView>;
}
