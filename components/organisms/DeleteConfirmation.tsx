import { Text, View } from 'react-native';
import type { DeleteAllDataViewModel } from '@/features/data';
import { ActionButton } from '@/components/atoms/ActionButton';

export function DeleteConfirmation({ model }: { model: DeleteAllDataViewModel }) {
  if (model.step !== 'disclosures' && model.step !== 'final') return null;
  return (
    <View accessibilityLiveRegion="polite" className="gap-4 rounded-md border border-line bg-surface p-4">
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
    </View>
  );
}
