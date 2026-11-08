import { Text, TextInput, View } from 'react-native';
import type { OnboardingViewModel } from '@/features/onboarding';
import { ActionButton } from '@/components/atoms/ActionButton';
import { InlineNotice } from '@/components/atoms/InlineNotice';
import { ChoiceGroup } from '@/components/molecules/ChoiceGroup';

export function OnboardingAboutYou({ model }: { model: OnboardingViewModel }) {
  return <View className="gap-4">
    <ChoiceGroup label="Sex for the starting estimate" options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }]} value={model.sex} onChange={model.chooseSex} horizontal />
    <InlineNotice text={model.sexError} error />
    {model.fields.map((field) => <View key={field.key} className="gap-1">
      <Text className="text-base text-text">{field.label}</Text>
      <TextInput accessibilityLabel={field.label} accessibilityRole="text" accessibilityValue={{ text: field.value }} accessibilityState={{ disabled: false }}
        accessibilityHint={field.error} value={field.value} onChangeText={(value) => model.setText(field.key, value)} onBlur={() => model.blur(field.key)}
        inputMode={field.key === 'age' ? 'numeric' : 'decimal'} returnKeyType="done" autoCorrect={false}
        className="min-h-12 rounded-sm border border-line bg-surface px-3 py-2 text-lg text-text" />
      <InlineNotice text={field.error} error />
      {field.key === 'weightKg' && <View className="gap-2">
        {model.health.available ? <ActionButton label={model.health.busy ? 'Checking Apple Health…' : 'Use Apple Health'} disabled={model.health.busy} variant="secondary" onPress={model.health.request} />
          : <Text className="text-sm text-muted">Type your weight. Apple Health is optional.</Text>}
        {model.health.sourceText && <Text selectable className="text-sm text-muted">{model.health.sourceText}</Text>}
        <InlineNotice text={model.health.message} />
      </View>}
    </View>)}
    <ChoiceGroup label="Daily activity" options={model.activityOptions} value={model.activityLevel} onChange={model.chooseActivity} />
  </View>;
}
