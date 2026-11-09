import { Pressable, Text, View, type AccessibilityActionEvent } from 'react-native';
import { formatQuantity, spokenKilograms, spokenReps } from './quantity';

const units = {
  kg: { symbol: 'kg', spoken: spokenKilograms },
  reps: { symbol: 'reps', spoken: spokenReps },
};

export function Stepper({ label, unit, value, step, min = 0, max, disabled = false, onChange, onDirectEntry }: {
  label: string;
  unit: keyof typeof units;
  value: number;
  step: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  /** Long-press on the value; the owner opens direct entry. */
  onDirectEntry: () => void;
}) {
  const { symbol, spoken } = units[unit];
  const noun = label.toLowerCase();
  const clamp = (next: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(next * 100) / 100));
  const stepBy = (direction: 1 | -1) => onChange(clamp(value + direction * step));
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);
  const onAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    if (nativeEvent.actionName === 'increment' && canIncrease) stepBy(1);
    else if (nativeEvent.actionName === 'decrement' && canDecrease) stepBy(-1);
    else if (nativeEvent.actionName === 'activate' && !disabled) onDirectEntry();
  };
  const button = (direction: 1 | -1, enabled: boolean) => (
    <Pressable accessibilityRole="button" disabled={!enabled} accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={`${direction === 1 ? 'Increase' : 'Decrease'} ${noun} by ${spoken(step)}`}
      onPress={() => stepBy(direction)}
      className="h-14 min-w-[44px] w-14 items-center justify-center rounded-md border border-line bg-surface-2">
      <Text accessibilityElementsHidden importantForAccessibility="no" className={`text-2xl ${enabled ? 'text-text' : 'text-muted'}`}>
        {direction === 1 ? '+' : '−'}
      </Text>
    </Pressable>
  );
  return (
    <View className="flex-row items-center gap-2">
      {button(-1, canDecrease)}
      <Pressable accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: spoken(value) }}
        accessibilityHint="Swipe up or down to adjust. Long press to enter a value."
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: `Enter ${noun}` }]}
        onAccessibilityAction={onAction} accessibilityState={{ disabled }} disabled={disabled}
        onLongPress={onDirectEntry}
        className="min-h-14 min-w-[44px] flex-1 items-center justify-center px-2">
        <Text className="font-display text-2xl text-text">{formatQuantity(value)}</Text>
        <Text className="text-base text-muted">{symbol}</Text>
      </Pressable>
      {button(1, canIncrease)}
    </View>
  );
}
