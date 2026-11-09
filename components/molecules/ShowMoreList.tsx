import { Children, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

/** Keeps a decision point to a handful of choices (UX-11): the rest is one tap away. */
export function ShowMoreList({ limit, noun, children }: { limit: number; noun: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const capped = items.length > limit;
  return (
    <View className="gap-3">
      {expanded || !capped ? items : items.slice(0, limit)}
      {capped && <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? `Show fewer ${noun}` : `Show all ${items.length} ${noun}`}
        onPress={() => setExpanded((value) => !value)} className="min-h-12 min-w-[44px] items-center justify-center self-start px-2">
        <Text className="text-base text-accent">{expanded ? `Show fewer ${noun}` : `Show all ${items.length} ${noun}`}</Text>
      </Pressable>}
    </View>
  );
}
