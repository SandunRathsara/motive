import { Pressable, Text, View, type AccessibilityActionEvent } from 'react-native';
import { formatQuantity, spokenKilograms, spokenReps } from './quantity';
import { StepButton, stepperControls } from './stepper-controls';

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
  const { stepBy, canDecrease, canIncrease, handleAdjust } = stepperControls({ value, step, min, max, disabled, onChange });
  const onAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    if (!handleAdjust(nativeEvent.actionName) && nativeEvent.actionName === 'activate' && !disabled) onDirectEntry();
  };
  const button = (direction: 1 | -1, enabled: boolean) => (
    <StepButton direction={direction} enabled={enabled} size="large" onPress={() => stepBy(direction)}
      accessibilityLabel={`${direction === 1 ? 'Increase' : 'Decrease'} ${noun} by ${spoken(step)}`} />
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
