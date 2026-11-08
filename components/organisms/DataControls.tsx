import { View } from 'react-native';
import type { DataExportViewModel, DeleteAllDataViewModel } from '@/features/data';
import { SettingsRow } from '@/components/molecules/SettingsRow';
import { ExportWarning } from './ExportWarning';
import { DeleteConfirmation } from './DeleteConfirmation';

export interface DataControlsProps {
  exportModel: DataExportViewModel;
  deleteModel: DeleteAllDataViewModel;
  busy: boolean;
  exportPaused: boolean;
  onOpenReport: () => void;
}

export function DataControls({ exportModel, deleteModel, busy, exportPaused, onOpenReport }: DataControlsProps) {
  const disabled = busy || exportModel.step !== 'idle' || deleteModel.step !== 'idle';
  return (
    <View className="gap-3">
      <ExportWarning model={exportModel} paused={exportPaused} />
      <DeleteConfirmation model={deleteModel} />
      <SettingsRow label="Export data" disabled={disabled} onPress={exportModel.begin}
        accessibilityHint="Shows a plaintext warning before sharing a JSON copy of your record" />
      <SettingsRow label="Delete all data" destructive disabled={disabled} onPress={deleteModel.begin}
        accessibilityHint="Shows what deletion covers, then asks for a final confirmation" />
      <SettingsRow label="Phase 1 report" navigation onPress={onOpenReport} />
    </View>
  );
}
