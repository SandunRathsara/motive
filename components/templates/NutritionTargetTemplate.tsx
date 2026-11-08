import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { NutritionTargetEditorModel } from '@/features/nutrition';
import { ActionButton } from '@/components/atoms/ActionButton';
import { SettingsRow } from '@/components/molecules/SettingsRow';

export function NutritionTargetTemplate({ model, onDone }: { model: NutritionTargetEditorModel; onDone: () => void }) {
  const [value, setValue] = useState(model.initialValue);
  const headerHeight = useHeaderHeight();
  const locked = model.busy || model.saved;
  return <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} className="flex-1 bg-bg">
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 p-6">
        <Text accessibilityRole="header" className="text-2xl font-semibold text-text">{model.label}</Text>
        {model.status === 'loading' ? <Text className="text-lg text-muted">Loading your targets…</Text>
          : model.status === 'error' ? <View className="gap-4">
            <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your targets. Your record hasn’t been changed.</Text>
            <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
          </View> : model.field === 'goal' ? <>
            <View className="gap-3">
              {model.goal.options.map((option) => <SettingsRow key={option.value} label={option.label} selected={model.goal.value === option.value}
                disabled={locked} onPress={() => model.goal.selectGoal(option.value)} />)}
            </View>
            {model.goal.rates.length > 0 && <View className="gap-3">
              <Text accessibilityRole="header" className="text-lg text-text">Rate per week</Text>
              {model.goal.rates.map((option) => <SettingsRow key={option.value} label={option.label} selected={model.goal.rate === option.value}
                disabled={locked} onPress={() => model.goal.selectRate(option.value)} />)}
            </View>}
            <Text className="text-base text-muted">Your kcal target will use your starting estimate and this rate. Your protein floor stays the same.</Text>
          </> : <View className="gap-3">
            <TextInput accessibilityLabel={model.label} accessibilityState={{ disabled: locked }} editable={!locked}
              keyboardType="number-pad" value={value} onChangeText={(text) => { setValue(text); model.reset(); }}
              className="min-h-14 rounded-sm border border-line bg-surface px-4 py-3 text-xl text-text" />
            <Text className="text-base text-muted">{model.field === 'kcal' ? 'kcal per day · positive whole number' : 'grams per day · positive whole number'}</Text>
          </View>}
        {model.errorText && <Text selectable accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-lg text-danger">{model.errorText}</Text>}
        {model.noticeText && <Text selectable accessibilityLiveRegion="polite" className="text-lg text-text">{model.noticeText}</Text>}
        {model.saved && <Text accessibilityLiveRegion="polite" className="text-lg text-text">Saved.</Text>}
      </ScrollView>
      <View className="border-t border-line-soft p-6">
        <ActionButton label={model.saved ? 'Done' : model.busy ? 'Saving…' : 'Save'} disabled={model.status !== 'ready' || model.busy}
          onPress={model.saved ? onDone : model.field === 'goal' ? model.goal.save : () => model.saveValue(value)} />
      </View>
    </SafeAreaView>
  </KeyboardAvoidingView>;
}
