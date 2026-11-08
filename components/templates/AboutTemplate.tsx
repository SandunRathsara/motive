import { ScrollView, Text, View } from 'react-native';
import { SettingsSection } from '@/components/organisms/SettingsSection';

export function AboutTemplate({ identity }: { identity: {
  version: string; buildNumber: string; buildId: string; gitTag: string | null;
} }) {
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-8 p-6 pb-10">
      <SettingsSection title="Installed build">
        <View className="gap-3 rounded-md bg-surface p-4">
          <Text selectable className="text-lg text-text">Version: {identity.version}</Text>
          <Text selectable className="text-lg text-text">Build number: {identity.buildNumber}</Text>
          <Text selectable className="text-lg text-text">Build ID: {identity.buildId}</Text>
          <Text selectable className="text-lg text-muted">{identity.gitTag ? `Git tag: ${identity.gitTag}` : 'Untagged development build'}</Text>
        </View>
      </SettingsSection>
      <SettingsSection title="Credits">
        <Text className="text-lg text-muted">Food data: USDA FoodData Central</Text>
      </SettingsSection>
    </ScrollView>
  );
}
