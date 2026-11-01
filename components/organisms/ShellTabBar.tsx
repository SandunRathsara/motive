import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Intrinsic height and wrapping labels avoid the navigator's fixed-height tab bar.
export function ShellTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="border-t border-line-soft bg-surface">
      <View className="flex-row">
      {state.routes.map((route, index) => {
        const selected = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            className="min-h-14 min-w-[44px] flex-1 items-center justify-center px-1 py-3"
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          >
            <Text className={`text-center text-base ${selected ? 'font-semibold text-accent' : 'text-muted'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </SafeAreaView>
  );
}
