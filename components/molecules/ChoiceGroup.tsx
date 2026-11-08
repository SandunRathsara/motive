import { Pressable, Text, View } from 'react-native';

export function ChoiceGroup<T extends string | number>({ label, options, value, onChange, horizontal = false }: {
  label: string; options: readonly { value: T; label: string }[]; value: T | ''; onChange: (value: T) => void; horizontal?: boolean;
}) {
  return <View className="gap-2">
    <Text className="text-base font-semibold text-text">{label}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className={horizontal ? 'flex-row flex-wrap gap-2' : 'gap-2'}>
      {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{ checked: value === option.value, disabled: false }} accessibilityValue={{ text: option.label }}
        onPress={() => onChange(option.value)} className={`min-h-12 justify-center rounded-sm border px-3 py-2 ${value === option.value ? 'border-accent bg-surface' : 'border-line bg-surface'}`}>
        <Text className="text-base text-text">{value === option.value ? '✓ ' : ''}{option.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}
