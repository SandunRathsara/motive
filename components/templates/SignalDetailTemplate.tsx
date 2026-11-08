import { useState } from 'react';
import { Text, View } from 'react-native';
import type { SignalDetailViewModel } from '@/features/health/health.types';
import { ActionButton } from '@/components/atoms/ActionButton';
import { SignalSourceBadge } from '@/components/molecules/SignalSourceBadge';
import { SignalStatusText } from '@/components/molecules/SignalStatusText';
import { DeleteSignalHistoryConfirmation } from '@/components/organisms/DeleteSignalHistoryConfirmation';
import { SignalSampleList } from '@/components/organisms/SignalSampleList';

export type SignalDetailTemplateProps = {
  model: SignalDetailViewModel;
  onDeleteHistory: () => void;
  readFailed?: boolean;
  onRetry?: () => void;
};

export function SignalDetailTemplate({ model, onDeleteHistory, readFailed, onRetry }: SignalDetailTemplateProps) {
  const [confirming, setConfirming] = useState(false);
  const value = model.value;
  const text = value.known ? value.text : value.copy;
  return <View className="flex-1 bg-bg"><SignalSampleList days={model.days} header={
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-3xl font-semibold text-text">{model.title}</Text>
      <Text className="text-2xl text-text">{text}{value.coverageText ? ` · ${value.coverageText}` : ''}</Text>
      {value.known && value.source && <SignalSourceBadge sourceName={value.source.name} userEntered={value.source.userEntered} />}
      {value.known && value.ageText && <Text className="text-base text-muted">{value.ageText}</Text>}
      <SignalStatusText text={model.statusText} />
      <Text className="text-base text-muted">{model.lastSyncText}</Text>
      {readFailed && <>
        <Text accessibilityLiveRegion="polite" className="text-base text-muted">Couldn’t refresh cached history. Showing the last loaded samples.</Text>
        <ActionButton label="Retry" variant="secondary" onPress={() => onRetry?.()} />
      </>}
    </View>
  } footer={<View className="gap-3 pt-6">
    {model.deleting && <Text accessibilityLiveRegion="polite" className="text-base text-muted">Deleting cached history…</Text>}
    {model.deleteErrorText && <Text accessibilityLiveRegion="polite" className="text-base text-muted">{model.deleteErrorText}</Text>}
    <ActionButton label="Delete this signal's history" variant="destructive" disabled={model.deleting} onPress={() => setConfirming(true)} />
  </View>} />
    <DeleteSignalHistoryConfirmation visible={confirming} signalTitle={model.title}
      onCancel={() => setConfirming(false)} onConfirm={() => { setConfirming(false); onDeleteHistory(); }} />
  </View>;
}
