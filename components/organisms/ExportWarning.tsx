import { Text, View } from 'react-native';
import type { DataExportViewModel } from '@/features/data';
import { ActionButton } from '@/components/atoms/ActionButton';

export function ExportWarning({ model, paused = false }: { model: DataExportViewModel; paused?: boolean }) {
  if (model.step === 'idle') return null;
  return (
    <View accessibilityLiveRegion="polite" className="gap-4 rounded-md border border-line bg-surface p-4">
      {model.step === 'warning' && <>
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">Before you export</Text>
        <Text className="text-lg text-text">This file is not encrypted and contains your health record. Anyone who can open it can read it.</Text>
        <ActionButton label="Continue to share sheet" onPress={model.confirm} />
        <ActionButton label="Cancel" variant="secondary" onPress={model.cancel} />
      </>}
      {model.step === 'exporting' && <Text className="text-lg text-text">
        {paused ? 'Paused for verification after export staging is written. Force-quit Motive now.' : 'Preparing your export…'}
      </Text>}
      {model.step === 'failed' && <>
        <Text accessibilityRole="alert" selectable className="text-lg text-danger">{model.reason}</Text>
        {model.code !== 'cleanupFailed' && <ActionButton label="Retry" onPress={model.retry} />}
        <ActionButton label="Dismiss" variant="secondary" onPress={model.dismiss} />
      </>}
      {model.step === 'done' && <>
        <Text className="text-lg text-text">Export finished.</Text>
        {model.skippedCount > 0 && <Text className="text-lg text-muted">{model.skippedCount} {model.skippedCount === 1 ? 'row couldn’t be read and was' : 'rows couldn’t be read and were'} skipped.</Text>}
        <ActionButton label="Done" variant="secondary" onPress={model.dismiss} />
      </>}
    </View>
  );
}
