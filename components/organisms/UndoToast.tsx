import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import type { UndoOffer } from '@/features/workouts';

/**
 * One-tap undo (TRN-3, UX-12). The owner clears the offer at its 5 s deadline, so this renders whatever
 * it is given. No dialog and no animation: nothing moves, which also satisfies Reduce Motion
 * (docs/REQUIREMENT.md §4). Each new offer is announced to VoiceOver ("Toasts and undo announced").
 */
export function UndoToast({ offer, errorText, onUndo }: {
  offer: Pick<UndoOffer, 'label' | 'accessibilityLabel' | 'deadlineMs'> | null;
  /** Shown even after the offer is gone, so a failed undo is never silent. */
  errorText?: string;
  onUndo: () => void;
}) {
  const label = offer?.label;
  const deadlineMs = offer?.deadlineMs;
  useEffect(() => {
    if (label !== undefined) AccessibilityInfo.announceForAccessibility(`${label}. Undo available.`);
  }, [label, deadlineMs]);

  if (!offer && !errorText) return null;
  return (
    // Not an accessible group: the Undo button must stay its own VoiceOver target.
    <View className="gap-2 rounded-md border border-line bg-surface-3 px-4 py-2">
      {offer && (
        <View className="flex-row items-center gap-3">
          <Text accessibilityLiveRegion="polite" className="flex-1 text-lg text-text">{offer.label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={offer.accessibilityLabel} onPress={onUndo}
            className="min-h-14 min-w-[44px] items-center justify-center rounded-md bg-accent px-4">
            <Text className="font-semibold text-lg text-accent-ink">Undo</Text>
          </Pressable>
        </View>
      )}
      {errorText && <Text accessibilityRole="alert" className="text-base text-danger">{errorText}</Text>}
    </View>
  );
}
