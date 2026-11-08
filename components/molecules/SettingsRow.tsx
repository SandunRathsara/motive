import { Pressable, Text, View } from 'react-native';

export function SettingsRow({ label, value, detail, navigation = false, destructive = false,
  disabled = false, selected, accessibilityHint, onPress }: {
  label: string;
  value?: string;
  detail?: string;
  navigation?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  accessibilityHint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint ?? detail}
      accessibilityValue={value ? { text: value } : undefined} accessibilityState={{ disabled, selected }}
      disabled={disabled} onPress={onPress}
      className="min-h-14 min-w-[44px] flex-row items-center gap-3 rounded-md bg-surface px-4 py-4">
      <View className="flex-1 gap-1">
        <Text className={`text-lg ${destructive ? 'text-danger' : 'text-text'}`}>{label}</Text>
        {value && <Text className="text-base text-muted">{value}</Text>}
        {detail && <Text className="text-base text-muted">{detail}</Text>}
        {disabled && <Text className="text-base text-muted">Unavailable</Text>}
      </View>
      {selected && <Text accessibilityElementsHidden importantForAccessibility="no" className="text-xl text-accent">✓</Text>}
      {navigation && <Text accessibilityElementsHidden importantForAccessibility="no" className="text-xl text-muted">›</Text>}
    </Pressable>
  );
}
