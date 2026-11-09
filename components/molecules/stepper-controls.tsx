import { Pressable, Text } from 'react-native';

/** Clamping and enablement shared by every −/+ stepper; values are rounded to two decimals to hide float noise. */
export function stepperControls({ value, step, min, max, disabled, onChange }: {
  value: number; step: number; min: number; max?: number; disabled: boolean; onChange: (next: number) => void;
}) {
  const clamp = (next: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(next * 100) / 100));
  const stepBy = (direction: 1 | -1) => onChange(clamp(value + direction * step));
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);
  /** Handles the screen reader's increment and decrement actions; false when the action is something else. */
  const handleAdjust = (actionName: string): boolean => {
    if (actionName === 'increment') { if (canIncrease) stepBy(1); return true; }
    if (actionName === 'decrement') { if (canDecrease) stepBy(-1); return true; }
    return false;
  };
  return { stepBy, canDecrease, canIncrease, handleAdjust };
}

const sizes = {
  large: { box: 'h-14 w-14', glyph: 'text-2xl' },
  medium: { box: 'h-12 w-12', glyph: 'text-xl' },
};

/** One 44pt+ − or + button; the visible glyph is hidden from screen readers, which hear the label. */
export function StepButton({ direction, enabled, accessibilityLabel, size, onPress }: {
  direction: 1 | -1; enabled: boolean; accessibilityLabel: string; size: keyof typeof sizes; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={!enabled} accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={accessibilityLabel} onPress={onPress}
      className={`${sizes[size].box} min-w-[44px] items-center justify-center rounded-md border border-line bg-surface-2`}>
      <Text accessibilityElementsHidden importantForAccessibility="no" className={`${sizes[size].glyph} ${enabled ? 'text-text' : 'text-muted'}`}>
        {direction === 1 ? '+' : '−'}
      </Text>
    </Pressable>
  );
}
