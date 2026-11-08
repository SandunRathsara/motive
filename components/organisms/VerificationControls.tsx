import { View } from 'react-native';
import type { FaultInjectionViewModel } from '@/features/data';
import { SettingsRow } from '@/components/molecules/SettingsRow';

export function VerificationControls({ model, disabled = false }: { model: FaultInjectionViewModel; disabled?: boolean }) {
  return (
    <View className="gap-2">
      <SettingsRow label="Pause after export staging is written" selected={model.armed === 'afterStaging'}
        disabled={disabled} onPress={() => model.arm('afterStaging')} />
      <SettingsRow label="Pause after the database is deleted" selected={model.armed === 'afterDatabaseDeleted'}
        disabled={disabled} onPress={() => model.arm('afterDatabaseDeleted')} />
      <SettingsRow label="No pause" selected={model.armed === null} disabled={disabled} onPress={() => model.arm(null)} />
    </View>
  );
}
