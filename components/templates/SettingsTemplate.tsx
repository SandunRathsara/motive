import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import type { FaultInjectionViewModel } from '@/features/data';
import { SettingsRow } from '@/components/molecules/SettingsRow';
import { DataControls, type DataControlsProps } from '@/components/organisms/DataControls';
import { SettingsSection } from '@/components/organisms/SettingsSection';
import { VerificationControls } from '@/components/organisms/VerificationControls';

// Later slices fill their named section slots. Current slots accept view models so routes stay thin.
export function SettingsTemplate({ plan, training, aiAndConsents, health, data, about, verification }: {
  plan?: ReactNode;
  training?: ReactNode;
  aiAndConsents?: ReactNode;
  health?: { onOpen: () => void };
  data?: DataControlsProps;
  about?: { onOpen: () => void };
  verification?: FaultInjectionViewModel;
}) {
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-8 p-6 pb-10">
      <SettingsSection title="Plan">{plan}</SettingsSection>
      <SettingsSection title="Training">{training}</SettingsSection>
      <SettingsSection title="AI and consents">{aiAndConsents}</SettingsSection>
      <SettingsSection title="Health">{health && <SettingsRow label="Health Signals" navigation onPress={health.onOpen} />}</SettingsSection>
      <SettingsSection title="Data">{data && <DataControls {...data} />}</SettingsSection>
      <SettingsSection title="About">{about && <SettingsRow label="About" navigation onPress={about.onOpen} />}</SettingsSection>
      <SettingsSection title="Verification">
        {verification?.available && <VerificationControls model={verification} disabled={data?.busy} />}
      </SettingsSection>
    </ScrollView>
  );
}
