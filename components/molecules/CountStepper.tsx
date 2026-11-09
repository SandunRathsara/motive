import { Text, View, type AccessibilityActionEvent } from 'react-native';
import { formatQuantity } from './quantity';
import { StepButton, stepperControls } from './stepper-controls';

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
  const { stepBy, canDecrease, canIncrease, handleAdjust } = stepperControls({ value, step, min, max, disabled, onChange });
  const onAction = ({ nativeEvent }: AccessibilityActionEvent) => { handleAdjust(nativeEvent.actionName); };
  const button = (direction: 1 | -1, enabled: boolean) => (
    <StepButton direction={direction} enabled={enabled} size="medium" onPress={() => stepBy(direction)}
      accessibilityLabel={`${direction === 1 ? 'Increase' : 'Decrease'} ${noun} by ${spoken(step)}`} />
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
