import { Tabs } from 'expo-router';
import { ShellTabBar } from '@/components/organisms/ShellTabBar';
import { UndoToast } from '@/components/organisms/UndoToast';
import { useUndo } from '@/features/workouts';

export default function TabLayout() {
  // One toast host for every tab: after deleting a session the user lands here with Undo still open (D2).
  const undo = useUndo();
  return (
    <Tabs
      tabBar={(props) => <ShellTabBar {...props} above={<UndoToast className="mx-4 mt-2" offer={undo.offer} errorText={undo.errorText} onUndo={() => { void undo.undo(); }} />} />}
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarAccessibilityLabel: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarAccessibilityLabel: 'Train' }} />
      <Tabs.Screen name="fuel" options={{ title: 'Fuel', tabBarAccessibilityLabel: 'Fuel' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarAccessibilityLabel: 'Coach' }} />
    </Tabs>
  );
}
