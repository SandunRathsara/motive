import { Tabs } from 'expo-router';
import { ShellTabBar } from '@/components/organisms/ShellTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ShellTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarAccessibilityLabel: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarAccessibilityLabel: 'Train' }} />
      <Tabs.Screen name="fuel" options={{ title: 'Fuel', tabBarAccessibilityLabel: 'Fuel' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarAccessibilityLabel: 'Coach' }} />
    </Tabs>
  );
}
