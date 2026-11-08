import { Text, View } from 'react-native';
import type { OnboardingViewModel } from '@/features/onboarding';
import { ChoiceGroup } from '@/components/molecules/ChoiceGroup';
import { ActionButton } from '@/components/atoms/ActionButton';

export function OnboardingGoal({ model }: { model: OnboardingViewModel }) {
  return <View className="gap-6">
    <ChoiceGroup label="Your Goal" options={model.goalOptions} value={model.goal} onChange={model.chooseGoal} />
    {model.rateOptions.length > 0 && <ChoiceGroup label="Rate per week" options={model.rateOptions.map((rate) => ({ value: rate, label: `${rate > 0 ? '+' : '−'}${Math.abs(rate)}% per week` }))} value={model.ratePreset ?? ''} onChange={model.chooseRate} />}
    <View className="gap-3">
      <Text className="text-base font-semibold text-text">Weekly session target</Text>
      <Text accessibilityRole="text" accessibilityLabel="Weekly session target" accessibilityValue={{ min: 1, max: 6, now: model.weeklySessionTarget }} className="text-xl text-text">{model.weeklySessionTarget} sessions per week</Text>
      <View className="flex-row gap-3">
        <ActionButton label="Fewer" accessibilityLabel="Fewer sessions" variant="secondary" disabled={model.weeklySessionTarget === 1} onPress={() => model.changeSessions(-1)} />
        <ActionButton label="More" accessibilityLabel="More sessions" variant="secondary" disabled={model.weeklySessionTarget === 6} onPress={() => model.changeSessions(1)} />
      </View>
    </View>
  </View>;
}
