import { useEffect } from 'react';
import { AccessibilityInfo, Text } from 'react-native';

export function InlineNotice({ text, error = false }: { text?: string | null; error?: boolean }) {
  useEffect(() => { if (text) AccessibilityInfo.announceForAccessibility(text); }, [text]);
  if (!text) return null;
  return <Text selectable accessibilityRole="alert" accessibilityLiveRegion="polite" className={`text-base ${error ? 'text-danger' : 'text-muted'}`}>{text}</Text>;
}
