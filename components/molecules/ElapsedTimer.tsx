import { useEffect, useReducer } from 'react';
import { Text, View } from 'react-native';
import { clock } from './clock';

function spoken(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const unit = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;
  return [hours > 0 ? unit(hours, 'hour') : null, hours > 0 || minutes > 0 ? unit(minutes, 'minute') : null, unit(seconds, 'second')]
    .filter(Boolean).join(' ');
}

/**
 * Elapsed time since a wall-clock start (TRN-3). Derived from `now()` on every tick, so time spent
 * suspended is counted. Its value is readable on demand but never live-announced: it would chatter.
 */
export function ElapsedTimer({ startedAt, now, running = true }: { startedAt: number; now: () => number; running?: boolean }) {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(rerender, 1000);
    return () => clearInterval(id);
  }, [running]);
  const seconds = Math.max(0, Math.floor((now() - startedAt) / 1000));
  return (
    <View accessible accessibilityRole="timer" accessibilityLabel="Elapsed time" accessibilityValue={{ text: spoken(seconds) }}>
      <Text className="font-display text-2xl text-text">{clock(seconds)}</Text>
    </View>
  );
}
