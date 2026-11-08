import { View } from 'react-native';

const positions = ['bottom-0', 'bottom-1.5', 'bottom-3', 'bottom-4', 'bottom-6', 'bottom-7', 'bottom-9', 'bottom-10'];

export function Sparkline({ label, points }: {
  label: string;
  points: readonly ({ known: true; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 } | { known: false })[];
}) {
  const days = Array.from({ length: 14 }, (_, index) => points[index]);
  const known = days.filter((point) => point?.known).length;
  return (
    <View accessible accessibilityRole="image"
      accessibilityLabel={`${label}, 14 days, ${known} of 14 known. Unknown days are gaps.`}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-12 flex-row gap-1">
        {days.map((point, index) => (
          <View key={index} className="relative h-12 flex-1">
            {point?.known && <View className={`absolute h-1 w-full rounded-full bg-accent ${positions[point.level]}`} />}
          </View>
        ))}
      </View>
    </View>
  );
}
