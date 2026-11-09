import type { ReactNode } from 'react';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Intrinsic height avoids the navigator's fixed-height tab bar. Like UIKit tab bars, labels scale
// only up to 1.5x so four words never break mid-word at AX sizes; long-press shows the Large Content Viewer.
export function ShellTabBar({ state, descriptors, emitter, navigateToTab, above }: BottomTabBarProps & {
  /** Shown directly above the tabs on every tab, for example the undo toast. */
  above?: ReactNode;
}) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="border-t border-line-soft bg-surface">
      {above}
      <View className="flex-row">
      {state.routes.map((route, index) => {
        const selected = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            accessibilityShowsLargeContentViewer
            accessibilityLargeContentTitle={label}
            className="min-h-14 min-w-[44px] flex-1 items-center justify-center px-1 py-3"
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!selected && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          >
            <Text maxFontSizeMultiplier={1.5} className={`text-center text-base ${selected ? 'font-semibold text-accent' : 'text-muted'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </SafeAreaView>
  );
}
