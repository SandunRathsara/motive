import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecordRecoveryViewModel } from '@/features/record-recovery';
import { ActionButton } from '@/components/atoms/ActionButton';

export function RecoveryTemplate({ model }: { model: RecordRecoveryViewModel }) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="grow justify-between p-6" keyboardShouldPersistTaps="handled">
        <View className="gap-6 py-8">
          <Text className="text-base font-semibold tracking-widest text-accent">MOTIVE · RECOVERY</Text>
          <Text accessibilityRole="header" className="text-3xl font-semibold text-text">{model.title}</Text>
          <Text className="text-lg text-muted">{model.body}</Text>
          {model.warning && <Text accessibilityRole="alert" className="text-lg text-text">{model.warning}</Text>}
          {model.step === 'erase' && <View className="gap-3">
            <Text className="text-lg text-text">Type {model.erasePhrase} to confirm.</Text>
            <TextInput accessibilityLabel="Erase confirmation" accessibilityRole="text" accessibilityState={{ disabled: model.busy }}
              editable={!model.busy} value={model.confirmation} onChangeText={model.setConfirmation} autoCapitalize="characters" autoCorrect={false}
              className="min-h-14 rounded-sm border border-line bg-surface px-4 py-3 text-lg text-text" />
          </View>}
          {model.error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-lg text-danger">{model.error}</Text>}
          {model.busy && <Text accessibilityLiveRegion="polite" className="text-base text-muted">Working…</Text>}
        </View>
        <View className="gap-3 pb-4 pt-6">
          {model.step === 'actions' ? <>
            <ActionButton label="Retry" disabled={model.busy} onPress={model.retry} />
            {model.snapshotExists && <ActionButton label="Restore snapshot" variant="secondary" disabled={model.busy} onPress={model.chooseRestore} />}
            <ActionButton label="Share raw database" variant="secondary" disabled={model.busy} onPress={model.chooseShare} />
            <ActionButton label="Erase and start over" variant="destructive" disabled={model.busy} onPress={model.chooseErase} />
          </> : <>
            {model.step === 'erase' ? <ActionButton label="Erase and start over" accessibilityLabel="Confirm erase and start over" variant="destructive" disabled={!model.canErase} onPress={model.confirmErase} />
              : model.step === 'restore' ? <ActionButton label="Restore snapshot" accessibilityLabel="Confirm restore snapshot" disabled={model.busy} onPress={model.confirmRestore} />
                : <ActionButton label="Continue to share sheet" disabled={model.busy} onPress={model.confirmShare} />}
            <ActionButton label="Cancel" variant="secondary" disabled={model.busy} onPress={model.cancel} />
          </>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
