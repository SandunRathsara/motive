import { Tabs } from 'expo-router';
import { ShellTabBar } from '@/components/organisms/ShellTabBar';
import { colors } from '@/lib/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={ShellTabBar}
      screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarAccessibilityLabel: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarAccessibilityLabel: 'Train' }} />
      <Tabs.Screen name="fuel" options={{ title: 'Fuel', tabBarAccessibilityLabel: 'Fuel' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarAccessibilityLabel: 'Coach' }} />
    </Tabs>
  );
}
