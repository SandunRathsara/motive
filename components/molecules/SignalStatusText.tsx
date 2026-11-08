import { Text } from 'react-native';

export function SignalStatusText({ text }: { text: string }) {
  return <Text accessibilityLabel={text} className="text-base text-muted">{text}</Text>;
}
