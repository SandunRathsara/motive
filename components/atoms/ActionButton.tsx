import { Pressable, Text } from 'react-native';

const variants = {
  primary: { button: 'bg-accent', text: 'font-semibold text-accent-ink' },
  secondary: { button: 'bg-surface', text: 'text-text' },
  destructive: { button: 'border border-danger bg-surface', text: 'font-semibold text-danger' },
};

export function ActionButton({ label, accessibilityLabel = label, onPress, disabled = false, variant = 'primary' }: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: keyof typeof variants;
}) {
  const classes = variants[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      className={`min-h-14 items-center justify-center rounded-md px-4 py-4 ${classes.button}`}>
      <Text className={`text-lg ${classes.text}`}>{label}</Text>
    </Pressable>
  );
}
