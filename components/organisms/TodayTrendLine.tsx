import { Pressable, Text } from 'react-native';
import type { TodayTrendLineViewModel } from '@/features/health/health.types';

export function TodayTrendLine({ candidate, onPress }: {
  candidate: TodayTrendLineViewModel | null;
  onPress: (type: TodayTrendLineViewModel['type']) => void;
}) {
  if (!candidate) return null;
  const text = [candidate.text, candidate.sourceLabel, candidate.staleAgeText].filter(Boolean).join(' · ');
  return (
    <Pressable testID="today-trend-line" accessibilityRole="button" accessibilityLabel={text}
      accessibilityHint="Opens signal detail" onPress={() => onPress(candidate.type)}
      className="min-h-[44px] min-w-[44px] justify-center rounded-md bg-surface px-4 py-4">
      <Text className="text-lg text-muted">{text}</Text>
    </Pressable>
  );
}
