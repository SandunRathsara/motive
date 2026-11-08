import { Pressable, Text, View } from 'react-native';
import type { SignalDisplayValue, SignalRowViewModel } from '@/features/health/health.types';
import { Sparkline } from '@/components/atoms/Sparkline';
import { SignalSourceBadge } from '@/components/molecules/SignalSourceBadge';
import { SignalStatusText } from '@/components/molecules/SignalStatusText';

function displayText(value: SignalDisplayValue) {
  const text = value.known ? value.text : value.copy;
  return `${text}${value.coverageText ? ` · ${value.coverageText}` : ''}`;
}

export function SignalRow({ model, onPress }: { model: SignalRowViewModel; onPress: () => void }) {
  return (
    <View className="gap-3 rounded-lg border border-line-soft bg-surface p-5">
      <Pressable testID={`signal-row-${model.type}`} accessibilityRole="button" accessibilityLabel={model.title}
        accessibilityValue={{ text: displayText(model.value) }} accessibilityHint={`Opens ${model.title} detail`}
        onPress={onPress} className="min-h-[44px] min-w-[44px] gap-2">
        <Text className="text-lg font-semibold text-text">{model.title}</Text>
        <Text className="text-2xl text-text">{displayText(model.value)}</Text>
      </Pressable>
      {model.value.known && model.value.source && <SignalSourceBadge sourceName={model.value.source.name} userEntered={model.value.source.userEntered} />}
      {model.value.known && model.value.ageText && <Text className="text-base text-muted">{model.value.ageText}</Text>}
      {model.trendWeight && <Text className="text-lg text-text">Trend Weight {displayText(model.trendWeight)}</Text>}
      <Sparkline label={model.title} points={model.points} />
      {model.baseline && <Text className="text-base text-muted">Baseline {displayText(model.baseline)}</Text>}
      <SignalStatusText text={model.statusText} />
      <Text className="text-base text-muted">{model.lastSyncText}</Text>
    </View>
  );
}
