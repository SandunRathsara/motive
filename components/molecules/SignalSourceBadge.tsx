import { Text, View } from 'react-native';

export function SignalSourceBadge({ sourceName, userEntered = false }: {
  sourceName: string | null;
  userEntered?: boolean;
}) {
  const entered = sourceName !== null && userEntered;
  return (
    <View accessible accessibilityRole="text"
      accessibilityLabel={`${sourceName ?? 'Source not yet available'}${entered ? ' · User-entered' : ''}`}
      className="flex-row flex-wrap items-center gap-2">
      <Text className="rounded-sm bg-surface-2 px-2 py-1 text-base text-muted">{sourceName ?? 'Source not yet available'}</Text>
      {entered && <Text className="text-base text-muted">User-entered</Text>}
    </View>
  );
}
