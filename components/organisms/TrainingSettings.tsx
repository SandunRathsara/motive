import { Text, View } from 'react-native';
import type { TrainingSettingsViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { SettingsRow } from '@/components/molecules/SettingsRow';

/**
 * Settings → Training (DATA-9): the weekly session target and the Training Program. Both open the
 * program editor, where one Save writes one *Your edit* Plan Version, so a target change never
 * creates a version per tap.
 */
export function TrainingSettings({ model, onOpenProgram }: { model: TrainingSettingsViewModel; onOpenProgram: () => void }) {
  if (model.status !== 'ready') {
    return <View className="gap-3">
      <Text accessibilityLiveRegion="polite" className="text-lg text-muted">
        {model.status === 'loading' ? 'Loading your training…' : 'Couldn’t read your training. Your record hasn’t been changed.'}
      </Text>
      {model.status === 'error' && <ActionButton label="Try again" variant="secondary" onPress={model.retry} />}
    </View>;
  }
  return <View className="gap-3">
    <SettingsRow label="Weekly session target" value={model.weeklyTargetText} navigation onPress={onOpenProgram} />
    <SettingsRow label="Training Program" value={model.programText} navigation onPress={onOpenProgram} />
  </View>;
}
