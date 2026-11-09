import { useEffect, useReducer, useRef } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { clock } from '@/components/molecules/clock';

const SEGMENTS = 10;
const TICK_MS = 250;

function spokenRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const parts = [
    minutes > 0 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : null,
    rest > 0 || minutes === 0 ? `${rest} ${rest === 1 ? 'second' : 'seconds'}` : null,
  ];
  return `${parts.filter(Boolean).join(' ')} remaining`;
}

/**
 * Non-blocking rest bar. Remaining time always derives from the wall-clock deadline, so time spent
 * suspended is counted. Nothing animates: progress is stepped segments and a text countdown, which
 * satisfies Reduce Motion (docs/REQUIREMENT.md §4) without a motion branch.
 */
export function RestBar({ deadlineMs, durationSeconds, now, onAddThirty, onSkip, onElapsed }: {
  deadlineMs: number;
  /** Length of the current rest, including any +30 s, used only to scale the segments. */
  durationSeconds: number;
  now: () => number;
  onAddThirty: () => void;
  onSkip: () => void;
  /** Called once per deadline when the countdown reaches zero. */
  onElapsed?: () => void;
}) {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const remaining = Math.max(0, Math.ceil((deadlineMs - now()) / 1000));
  const elapsed = remaining === 0;
  const reported = useRef<number | null>(null);

  useEffect(() => {
    if (elapsed) return undefined;
    const id = setInterval(rerender, TICK_MS);
    return () => clearInterval(id);
  }, [elapsed, deadlineMs]);

  useEffect(() => {
    if (!elapsed || reported.current === deadlineMs) return;
    reported.current = deadlineMs;
    AccessibilityInfo.announceForAccessibility('Rest over');
    onElapsed?.();
  }, [elapsed, deadlineMs, onElapsed]);

  const filled = elapsed ? 0 : Math.ceil((remaining / Math.max(durationSeconds, remaining)) * SEGMENTS);
  return (
    <View className="gap-2 rounded-md border border-line bg-surface-2 px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View accessible accessibilityRole="timer" accessibilityLabel="Rest"
          accessibilityValue={{ text: elapsed ? 'Rest over' : spokenRemaining(remaining) }} className="flex-1">
          <Text className="text-base text-muted">Rest</Text>
          <Text className="font-display text-2xl text-accent">{elapsed ? 'Rest over' : clock(remaining)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add 30 seconds" onPress={onAddThirty}
          className="min-h-12 min-w-[44px] items-center justify-center rounded-md border border-line bg-surface px-3">
          <Text className="text-base text-text">+30 s</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={elapsed ? 'Dismiss rest' : 'Skip rest'} onPress={onSkip}
          className="min-h-12 min-w-[44px] items-center justify-center rounded-md bg-accent px-3">
          <Text className="font-semibold text-base text-accent-ink">{elapsed ? 'Dismiss' : 'Skip'}</Text>
        </Pressable>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-1 flex-row gap-1">
        {Array.from({ length: SEGMENTS }, (_, index) => index < filled ? (
          <View key={index} testID="rest-segment-filled" className="h-1 flex-1 rounded-full bg-accent" />
        ) : (
          <View key={index} className="h-1 flex-1 rounded-full bg-surface-3" />
        ))}
      </View>
    </View>
  );
}
