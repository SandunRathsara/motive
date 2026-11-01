import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type Props = { title: string; message: string };

export function PlaceholderTemplate({ title, message }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-bg">
      <ScrollView>
        <View className="gap-6 px-6 py-8">
          <Text className="text-base font-semibold tracking-widest text-accent">MOTIVE</Text>
          <Text accessibilityRole="header" className="text-4xl font-semibold text-text">{title}</Text>
          <View className="gap-3 rounded-lg border border-line-soft bg-surface p-6">
            <Text className="text-xl font-semibold text-text">Not built yet</Text>
            <Text className="text-lg text-muted">{message}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
