import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none', statusBarStyle: 'light' }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
