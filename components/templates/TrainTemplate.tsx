import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TrainingWeekViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { InlineNotice } from '@/components/atoms/InlineNotice';
import { SettingsRow } from '@/components/molecules/SettingsRow';
import { TrainingWeek } from '@/components/organisms/TrainingWeek';

/** S2 Train tab. The primary action (Start next / Resume) sits in a bottom bar, in thumb reach (UX-8). */
export function TrainTemplate({ model, busy = false, errorText, onStartTemplate, onResume, onOpenSession, onEditProgram }: {
  model: TrainingWeekViewModel;
  busy?: boolean;
  errorText?: string;
  onStartTemplate: (templateId: string) => void;
  onResume: () => void;
  onOpenSession: (sessionId: string) => void;
  onEditProgram: () => void;
}) {
  const primary = model.status !== 'ready' ? null
    : model.active ? { label: `Resume ${model.active.templateName}`, onPress: onResume }
      : model.next ? { label: `Start ${model.next.templateName}`, onPress: () => onStartTemplate(model.next!.templateId) } : null;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-6 px-6 py-8">
        <Text accessibilityRole="header" className="text-4xl font-semibold text-text">Train</Text>
        {model.status === 'loading' && <Text accessibilityLiveRegion="polite" className="text-lg text-muted">Loading your training…</Text>}
        {model.status === 'error' && <View className="gap-3">
          <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your training. Your record hasn’t been changed.</Text>
          <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
        </View>}
        {model.status === 'ready' && <>
          {model.active && <View className="gap-1 rounded-lg border border-accent bg-surface p-6">
            <Text className="text-xl font-semibold text-text">{model.active.templateName}</Text>
            <Text className="text-base text-muted">{model.active.detail}</Text>
          </View>}
          <TrainingWeek content={model} busy={busy} onStartTemplate={onStartTemplate} onOpenSession={onOpenSession} />
          <SettingsRow label="Training Program" detail="Templates, exercises, sets and your weekly target" navigation onPress={onEditProgram} />
        </>}
      </ScrollView>
      {(primary || errorText) && <View className="gap-3 border-t border-line-soft bg-bg px-6 py-4">
        <InlineNotice text={errorText} error />
        {primary && <ActionButton label={primary.label} disabled={busy} onPress={primary.onPress} />}
      </View>}
    </SafeAreaView>
  );
}
