import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecordRecoveryViewModel } from '@/features/record-recovery';

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
            <Pressable accessibilityRole="button" accessibilityLabel="Retry" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.retry} className="min-h-14 items-center justify-center rounded-md bg-accent px-4 py-4">
              <Text className="text-lg font-semibold text-accent-ink">Retry</Text>
            </Pressable>
            {model.snapshotExists && <Pressable accessibilityRole="button" accessibilityLabel="Restore snapshot" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.chooseRestore} className="min-h-14 items-center justify-center rounded-md bg-surface px-4 py-4">
              <Text className="text-lg text-text">Restore snapshot</Text>
            </Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Share raw database" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.chooseShare} className="min-h-14 items-center justify-center rounded-md bg-surface px-4 py-4">
              <Text className="text-lg text-text">Share raw database</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Erase and start over" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.chooseErase} className="min-h-14 items-center justify-center rounded-md border border-danger px-4 py-4">
              <Text className="text-lg text-danger">Erase and start over</Text>
            </Pressable>
          </> : <>
            {model.step === 'erase' ? <Pressable accessibilityRole="button" accessibilityLabel="Confirm erase and start over" accessibilityState={{ disabled: !model.canErase }} disabled={!model.canErase} onPress={model.confirmErase} className="min-h-14 items-center justify-center rounded-md border border-danger bg-surface px-4 py-4">
              <Text className="text-lg font-semibold text-danger">Erase and start over</Text>
            </Pressable> : model.step === 'restore' ? <Pressable accessibilityRole="button" accessibilityLabel="Confirm restore snapshot" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.confirmRestore} className="min-h-14 items-center justify-center rounded-md bg-accent px-4 py-4">
              <Text className="text-lg font-semibold text-accent-ink">Restore snapshot</Text>
            </Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Continue to share sheet" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.confirmShare} className="min-h-14 items-center justify-center rounded-md bg-accent px-4 py-4">
              <Text className="text-lg font-semibold text-accent-ink">Continue to share sheet</Text>
            </Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" accessibilityState={{ disabled: model.busy }} disabled={model.busy} onPress={model.cancel} className="min-h-14 items-center justify-center rounded-md bg-surface px-4 py-4">
              <Text className="text-lg text-text">Cancel</Text>
            </Pressable>
          </>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
