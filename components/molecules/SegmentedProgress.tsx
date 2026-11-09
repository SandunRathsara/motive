import { View } from 'react-native';

/**
 * Progress as one block per unit (a week's sessions), so the fill needs no dynamic width. The caller
 * supplies the spoken/visible text; meaning is never colour-only.
 */
export function SegmentedProgress({ label, completed, total, valueText }: {
  label: string;
  completed: number;
  total: number;
  valueText: string;
}) {
  const count = Math.max(1, Math.round(total));
  const filled = Math.min(count, Math.max(0, Math.round(completed)));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: count, now: filled, text: valueText }} className="flex-row gap-2">
      {Array.from({ length: count }, (_, index) => index < filled
        ? <View key={index} testID="progress-segment-filled" className="h-3 flex-1 rounded-full bg-accent" />
        : <View key={index} testID="progress-segment-empty" className="h-3 flex-1 rounded-full border border-line bg-surface-2" />)}
    </View>
  );
}
