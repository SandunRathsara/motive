import { Pressable, Text, View } from 'react-native';
import { formatQuantity, spokenKilograms, spokenReps } from './quantity';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type SetValue = { loadKg: number | null; reps: number };

const saveText: Record<Exclude<SaveState, 'idle'>, string> = {
  saving: 'Saving…',
  saved: '✓ Saved',
  failed: 'Not saved. Tap to retry',
};

function visible({ loadKg, reps }: SetValue, bodyweight: boolean): string {
  if (bodyweight) return `${formatQuantity(reps)} reps`;
  return `${loadKg === null ? '—' : formatQuantity(loadKg)} × ${formatQuantity(reps)}`;
}

function spoken({ loadKg, reps }: SetValue, bodyweight: boolean): string {
  if (bodyweight) return spokenReps(reps);
  return loadKg === null ? `Load not set, ${spokenReps(reps)}` : `${spokenKilograms(loadKg)}, ${spokenReps(reps)}`;
}

export function SetChip({ testID, loadKg, reps, bodyweight = false, recommended, last, saveState = 'idle', disabled = false, onPress }: {
  testID?: string;
  loadKg: number | null;
  reps: number;
  bodyweight?: boolean;
  /** True when the value is a Recommended Set; false on an exercise's first session. */
  recommended: boolean;
  last?: SetValue;
  saveState?: SaveState;
  disabled?: boolean;
  onPress: () => void;
}) {
  const needsLoad = !bodyweight && loadKg === null;
  const blocked = disabled || needsLoad || saveState === 'saving' || saveState === 'saved';
  const label = [
    spoken({ loadKg, reps }, bodyweight),
    bodyweight ? 'bodyweight' : null,
    recommended ? 'recommended' : null,
    saveState === 'idle' ? null : saveState === 'failed' ? 'not saved' : saveState,
  ].filter(Boolean).join(', ');
  const hint = last
    ? `Last session ${spoken(last, bodyweight)}. ${saveState === 'failed' ? 'Retries saving this set.' : 'Logs this set.'}`
    : needsLoad ? 'Set a load with the steppers first.' : undefined;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
      accessibilityState={{ disabled: blocked, busy: saveState === 'saving' }} disabled={blocked} onPress={onPress}
      className={`min-h-14 min-w-[44px] flex-1 justify-center rounded-md border px-4 py-2 ${
        saveState === 'failed' ? 'border-danger bg-surface-2' : recommended ? 'border-accent bg-surface-2' : 'border-line bg-surface-2'}`}>
      <Text className="font-display text-2xl text-text">{visible({ loadKg, reps }, bodyweight)}</Text>
      <View className="flex-row flex-wrap gap-x-3">
        {last && <Text className="text-base text-muted">last {visible(last, bodyweight)}</Text>}
        {needsLoad && <Text className="text-base text-muted">Set a load</Text>}
        {saveState !== 'idle' && (
          <Text className={`text-base ${saveState === 'failed' ? 'text-danger' : 'text-muted'}`}>{saveText[saveState]}</Text>
        )}
      </View>
    </Pressable>
  );
}
