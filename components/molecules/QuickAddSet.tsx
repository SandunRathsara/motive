import { Pressable, Text } from 'react-native';
import type { TodayTrainingViewModel } from '@/features/workouts';

/**
 * The always-visible Set quick-add (TODAY-5). It never logs on its own: it opens the session in progress,
 * or starts the next template, so a set is one tap from anywhere on Today. Place it in the bottom 40%.
 */
export function QuickAddSet({ model, busy = false, onPress }: { model: TodayTrainingViewModel; busy?: boolean; onPress: () => void }) {
  const usable = model.status === 'ready' && model.action !== 'none' && !busy;
  const hint = model.status !== 'ready' || model.action === 'none' ? undefined
    : model.action === 'resume' ? `Opens your ${model.templateName} session` : `Starts ${model.templateName}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Add set" accessibilityHint={hint}
      accessibilityState={{ disabled: !usable, busy }} disabled={!usable} onPress={onPress}
      className={`min-h-14 min-w-[44px] flex-row items-center justify-center gap-2 rounded-md px-6 py-4 ${usable ? 'bg-accent' : 'border border-line bg-surface'}`}>
      <Text accessibilityElementsHidden importantForAccessibility="no" className={`text-2xl ${usable ? 'text-accent-ink' : 'text-muted'}`}>+</Text>
      <Text className={`text-lg font-semibold ${usable ? 'text-accent-ink' : 'text-muted'}`}>Set</Text>
    </Pressable>
  );
}
