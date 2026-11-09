import { Pressable, Text, View, type AccessibilityActionEvent } from 'react-native';
import { formatQuantity } from './quantity';

/**
 * A compact −/+ control for small program quantities (sets, reps, seconds, kilograms). 44pt+ targets, an
 * adjustable value for VoiceOver. Direct entry is intentionally absent: the ranges are small.
 */
export function CountStepper({ label, value, unit, unitPlural = unit, step, min = 0, max, disabled = false, valueText, onChange }: {
  label: string;
  value: number;
  /** Shown beside the value and spoken, e.g. "set", "kg", "s". */
  unit: string;
  unitPlural?: string;
  step: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Replaces the number on screen (e.g. "Default 90"); the spoken value still uses `value`. */
  valueText?: string;
  onChange: (next: number) => void;
}) {
  const noun = label.toLowerCase();
  const spoken = (amount: number) => `${formatQuantity(amount)} ${amount === 1 ? unit : unitPlural}`;
  const clamp = (next: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(next * 100) / 100));
  const stepBy = (direction: 1 | -1) => onChange(clamp(value + direction * step));
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);
  const onAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    if (nativeEvent.actionName === 'increment' && canIncrease) stepBy(1);
    else if (nativeEvent.actionName === 'decrement' && canDecrease) stepBy(-1);
  };
  const button = (direction: 1 | -1, enabled: boolean) => (
    <Pressable accessibilityRole="button" disabled={!enabled} accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={`${direction === 1 ? 'Increase' : 'Decrease'} ${noun} by ${spoken(step)}`}
      onPress={() => stepBy(direction)}
      className="h-12 w-12 min-w-[44px] items-center justify-center rounded-md border border-line bg-surface-2">
      <Text accessibilityElementsHidden importantForAccessibility="no" className={`text-xl ${enabled ? 'text-text' : 'text-muted'}`}>
        {direction === 1 ? '+' : '−'}
      </Text>
    </Pressable>
  );
  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
      <Text className="min-w-[96px] flex-1 text-base text-muted">{label}</Text>
      <View className="flex-row items-center gap-2">
        {button(-1, canDecrease)}
        <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: spoken(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={onAction}
          accessibilityState={{ disabled }} className="min-h-12 min-w-[64px] items-center justify-center px-1">
          <Text className="font-display text-xl text-text">{valueText ?? formatQuantity(value)}</Text>
          {valueText === undefined && <Text className="text-base text-muted">{value === 1 ? unit : unitPlural}</Text>}
        </View>
        {button(1, canIncrease)}
      </View>
    </View>
  );
}
