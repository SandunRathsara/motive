import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EraseLifecycleViewModel } from '@/features/data';
import { ActionButton } from '@/components/atoms/ActionButton';

export function EraseStatusTemplate({ phase, paused, onRetry }: {
  phase: 'erasing' | 'erase-blocked';
  paused: EraseLifecycleViewModel['paused'];
  onRetry: () => void;
}) {
  const blocked = phase === 'erase-blocked';
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="grow justify-between p-6">
        <View accessibilityLiveRegion="polite" className="gap-6 py-8">
          <Text className="text-base font-semibold tracking-widest text-accent">MOTIVE</Text>
          <Text accessibilityRole="header" className="text-3xl font-semibold text-text">{blocked ? 'Deletion not finished' : 'Deleting your data…'}</Text>
          <Text className={`text-lg ${blocked ? 'text-danger' : 'text-muted'}`}>
            {blocked ? 'Motive couldn’t finish deleting its data. Your record stays closed until deletion is verified. Retry to finish.'
              : 'Motive is removing its data from this device. Please keep the app open.'}
          </Text>
          {!blocked && paused && <Text className="text-lg text-text">
            Paused for verification after {paused === 'afterDatabaseDeleted' ? 'the database is deleted' : 'export staging is written'}. Force-quit Motive now.
          </Text>}
        </View>
        {blocked && <View className="pb-4 pt-6"><ActionButton label="Retry" onPress={onRetry} /></View>}
      </ScrollView>
    </SafeAreaView>
  );
}
