import { Text, View } from 'react-native';
import type { OnboardingViewModel } from '@/features/onboarding';
import { InlineNotice } from '@/components/atoms/InlineNotice';

export function StartingPlanPreview({ plan }: { plan: NonNullable<OnboardingViewModel['plan']> }) {
  return <View className="gap-5">
    <View className="gap-1 rounded-md bg-surface p-4">
      <Text className="text-base text-muted">Daily kcal target</Text>
      <Text selectable className="text-4xl font-semibold text-text">{plan.kcalText}</Text>
      <Text className="text-base text-muted">starting estimate</Text>
      <Text selectable className="pt-2 text-lg text-text">Protein floor · {plan.proteinText}</Text>
      <Text selectable className="text-base text-muted">Fat minimum · {plan.fatText} · for reference, not enforced</Text>
    </View>
    <InlineNotice text={plan.clampText} />
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold text-text">{plan.programName}</Text>
      {plan.exercises.map((exercise) => <View key={exercise.id} className="gap-1 border-b border-line-soft pb-2">
        <Text className="text-base text-text">{exercise.name}</Text>
        <Text className="text-base text-muted">{exercise.prescription}</Text>
      </View>)}
    </View>
  </View>;
}
