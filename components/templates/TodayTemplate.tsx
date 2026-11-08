import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TodayPlanViewModel } from '@/features/plan';
import { ActionButton } from '@/components/atoms/ActionButton';

export function TodayTemplate({ model, onOpenSettings, onOpenTargets, onEditKcal, onEditProtein, trendLine }: {
  model: TodayPlanViewModel;
  onOpenSettings: () => void;
  onOpenTargets: () => void;
  onEditKcal: () => void;
  onEditProtein: () => void;
  trendLine?: ReactNode;
}) {
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-bg">
    <ScrollView contentContainerClassName="gap-6 px-6 py-8">
      <View className="flex-row items-center gap-4">
        <View className="flex-1 gap-2">
          <Text accessibilityRole="header" className="text-4xl font-semibold text-text">Today</Text>
          <Text className="text-lg text-muted">{model.dateLabel}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" accessibilityHint="Opens Settings"
          onPress={onOpenSettings} className="h-14 w-14 items-center justify-center rounded-full border border-line bg-surface">
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="items-center gap-1">
            <View className="h-3 w-3 rounded-full bg-muted" />
            <View className="h-3 w-6 rounded-t-full bg-muted" />
          </View>
        </Pressable>
      </View>
      {model.targets && <View className="gap-4 rounded-lg border border-line-soft bg-surface p-6">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">Your targets</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="kcal target" accessibilityValue={{ text: `${model.targets.kcalTarget.toLocaleString()} kcal${model.targets.kcalOrigin === 'startingEstimate' ? ', starting estimate' : ''}` }}
          accessibilityHint="Edit kcal target in Settings" onPress={onEditKcal} className="min-h-14 gap-1 py-2">
          <Text selectable className="text-3xl font-semibold text-text">{model.targets.kcalTarget.toLocaleString()} kcal</Text>
          {model.targets.kcalOrigin === 'startingEstimate' && <Text className="text-base text-muted">starting estimate</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Protein floor" accessibilityValue={{ text: `${model.targets.proteinFloorG} grams` }}
          accessibilityHint="Edit protein floor in Settings" onPress={onEditProtein} className="min-h-14 gap-1 py-2">
          <Text selectable className="text-3xl font-semibold text-text">{model.targets.proteinFloorG} g</Text>
          <Text className="text-base text-muted">protein floor</Text>
        </Pressable>
      </View>}
      {model.status === 'loading' && <Text accessibilityLiveRegion="polite" className="text-lg text-muted">Loading your targets…</Text>}
      {model.status === 'error' && <View className="gap-3">
        <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your targets. Your record hasn’t been changed.</Text>
        <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
      </View>}
      {model.chipLabel && <Pressable accessibilityRole="button" accessibilityLabel={model.chipLabel}
        accessibilityHint="Opens targets in Settings" onPress={onOpenTargets} className="min-h-14 justify-center self-start rounded-full border border-line bg-surface px-5 py-3">
        <Text className="text-base text-text">{model.chipLabel}</Text>
      </Pressable>}
      {trendLine}
    </ScrollView>
  </SafeAreaView>;
}
