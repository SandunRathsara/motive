import { Modal, ScrollView, Text } from 'react-native';
import type { DeleteAllDataViewModel } from '@/features/data';
import { ActionButton } from '@/components/atoms/ActionButton';

export function DeleteConfirmation({ model }: { model: DeleteAllDataViewModel }) {
  if (model.step !== 'disclosures' && model.step !== 'final') return null;
  return (
    <Modal testID="delete-confirmation-sheet" visible presentationStyle="pageSheet" animationType="slide"
      allowSwipeDismissal onRequestClose={model.cancel}>
      <ScrollView testID="delete-confirmation-content" accessibilityLiveRegion="polite" accessibilityViewIsModal
        className="flex-1 bg-bg" contentContainerClassName="gap-4 p-6 pb-10" contentInsetAdjustmentBehavior="automatic">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">
          {model.step === 'disclosures' ? 'Before you delete' : 'Delete everything?'}
        </Text>
        {model.step === 'disclosures' ? <>
          <Text className="text-lg text-text">{model.disclosures}</Text>
          <ActionButton label="Continue" onPress={model.next} />
        </> : <>
          <Text className="text-lg text-text">This cannot be undone. Motive will return to a fresh start.</Text>
          <ActionButton label="Delete everything" variant="destructive" onPress={model.confirm} />
        </>}
        <ActionButton label="Cancel" variant="secondary" onPress={model.cancel} />
      </ScrollView>
    </Modal>
  );
}
