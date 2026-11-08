import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function SettingsSection({ title, children }: { title: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold text-text">{title}</Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}
