import { Modal, ScrollView, Text } from 'react-native';
import { ActionButton } from '@/components/atoms/ActionButton';

export function DeleteSignalHistoryConfirmation({ visible, signalTitle, onConfirm, onCancel }: {
  visible: boolean;
  signalTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal testID="delete-signal-history-sheet" visible presentationStyle="pageSheet" animationType="none"
      allowSwipeDismissal onRequestClose={onCancel}>
      <ScrollView accessibilityViewIsModal className="flex-1 bg-bg" contentContainerClassName="gap-4 p-6 pb-10"
        contentInsetAdjustmentBehavior="automatic">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">Delete {signalTitle} history?</Text>
        <Text className="text-lg text-text">This deletes only the cached {signalTitle} history in Motive.</Text>
        <Text className="text-lg text-text">Apple Health keeps its own data. Turn off access in Apple Health first, otherwise the next sync reads the history again.</Text>
        <ActionButton label="Delete history" accessibilityLabel="Confirm delete signal history" variant="destructive" onPress={onConfirm} />
        <ActionButton label="Cancel" variant="secondary" onPress={onCancel} />
      </ScrollView>
    </Modal>
  );
}
