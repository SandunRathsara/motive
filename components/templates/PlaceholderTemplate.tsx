import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type Props = { title: string; message: string; onOpenSettings?: () => void };

export function PlaceholderTemplate({ title, message, onOpenSettings }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-bg">
      <ScrollView>
        <View className="gap-6 px-6 py-8">
          <Text className="text-base font-semibold tracking-widest text-accent">MOTIVE</Text>
          <View className="flex-row items-center gap-4">
            <Text accessibilityRole="header" className="flex-1 text-4xl font-semibold text-text">{title}</Text>
            {onOpenSettings && <Pressable accessibilityRole="button" accessibilityLabel="Settings"
              accessibilityHint="Opens Settings" onPress={onOpenSettings}
              className="h-14 w-14 items-center justify-center gap-1 rounded-full border border-line bg-surface">
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="items-center gap-1">
                <View className="h-3 w-3 rounded-full bg-muted" />
                <View className="h-3 w-6 rounded-t-full bg-muted" />
              </View>
            </Pressable>}
          </View>
          <View className="gap-3 rounded-lg border border-line-soft bg-surface p-6">
            <Text className="text-xl font-semibold text-text">Not built yet</Text>
            <Text className="text-lg text-muted">{message}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
