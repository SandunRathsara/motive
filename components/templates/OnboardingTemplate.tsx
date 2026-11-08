import { useEffect } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingViewModel } from '@/features/onboarding';
import { ActionButton } from '@/components/atoms/ActionButton';
import { InlineNotice } from '@/components/atoms/InlineNotice';
import { OnboardingAboutYou } from '@/components/organisms/OnboardingAboutYou';
import { OnboardingGoal } from '@/components/organisms/OnboardingGoal';
import { StartingPlanPreview } from '@/components/organisms/StartingPlanPreview';

export function OnboardingTemplate({ model }: { model: OnboardingViewModel }) {
  useEffect(() => { AccessibilityInfo.announceForAccessibility(model.title); }, [model.title]);
  return <SafeAreaView className="flex-1 bg-bg">
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="gap-1 px-6 pb-3 pt-3">
        <Text className="text-sm text-muted">MOTIVE · {model.step + 1} of 3</Text>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" className="text-2xl font-semibold text-text">{model.title}</Text>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-4" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {model.step === 0 ? <OnboardingAboutYou model={model} /> : model.step === 1 ? <OnboardingGoal model={model} /> : model.plan && <StartingPlanPreview plan={model.plan} />}
      </ScrollView>
      <View className="gap-2 border-t border-line-soft px-6 pb-3 pt-3">
        <InlineNotice text={model.errorText} error />
        {model.step > 0 && <ActionButton label="Back" variant="secondary" disabled={model.busy} onPress={model.back} />}
        <ActionButton label={model.busy ? 'Starting…' : model.step === 2 ? 'Start' : 'Continue'} disabled={model.busy} onPress={() => { Keyboard.dismiss(); if (model.step === 2) void model.start(); else model.next(); }} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
