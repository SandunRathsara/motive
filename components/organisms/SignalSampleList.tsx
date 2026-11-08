import type { ReactElement } from 'react';
import { SectionList, Text, View } from 'react-native';
import type { SignalSampleDayViewModel } from '@/features/health/health.types';
import { SignalSourceBadge } from '@/components/molecules/SignalSourceBadge';

export function SignalSampleList({ days, header, footer }: {
  days: readonly SignalSampleDayViewModel[];
  header?: ReactElement;
  footer?: ReactElement;
}) {
  return (
    <SectionList className="flex-1 bg-bg" contentContainerClassName="p-6 pb-10"
      contentInsetAdjustmentBehavior="automatic" stickySectionHeadersEnabled={false}
      sections={days.map((day) => ({ key: day.id, title: day.dayText, data: day.samples }))}
      keyExtractor={(sample) => sample.id} ListHeaderComponent={header} ListFooterComponent={footer}
      ListEmptyComponent={<Text testID="signal-history-empty" accessibilityLabel="No cached samples for this signal."
        className="py-6 text-lg text-muted">No cached samples for this signal.</Text>}
      renderSectionHeader={({ section }) => (
        <View className="bg-bg pb-3 pt-6">
          <Text accessibilityRole="header" className="text-lg font-semibold text-text">{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View className="mb-3 gap-2 rounded-md border border-line-soft bg-surface p-4">
          <Text className="text-xl text-text">{item.valueText}</Text>
          <Text className="text-base text-muted">{item.timeText}</Text>
          <SignalSourceBadge sourceName={item.source.name} userEntered={item.source.userEntered} />
          {item.notInBaseline && <Text className="text-base text-muted">Not in baseline</Text>}
          {item.notUsedThisNight && <Text className="text-base text-muted">Not used this night</Text>}
        </View>
      )} />
  );
}
