import { Text, View } from 'react-native';
import type { PlanState } from '@/features/plan';
import { SettingsRow } from '@/components/molecules/SettingsRow';
import { ActionButton } from '@/components/atoms/ActionButton';

const goalLabels = { fatLoss: 'Fat Loss', maintenance: 'Maintenance', muscleGain: 'Muscle Gain' };

export function NutritionSettings({ state, loading, onEdit, onRetry }: {
  state: PlanState | null;
  loading: boolean;
  onEdit: (field: 'goal' | 'kcal' | 'protein') => void;
  onRetry: () => void;
}) {
  if (!state) return <View className="gap-3">
    <Text accessibilityLiveRegion="polite" className="text-lg text-muted">{loading ? 'Loading your targets…' : 'Couldn’t read your targets. Your record hasn’t been changed.'}</Text>
    {!loading && <ActionButton label="Try again" variant="secondary" onPress={onRetry} />}
  </View>;
  return <View nativeID="targets" className="gap-3">
    <SettingsRow label="Goal & rate preset" value={`${goalLabels[state.goal]}${state.ratePreset === null ? '' : ` · ${state.ratePreset > 0 ? '+' : '−'}${Math.abs(state.ratePreset)}% per week`}`}
      navigation onPress={() => onEdit('goal')} />
    <SettingsRow label="kcal target" value={`${state.kcalTarget.toLocaleString()} kcal`}
      detail={state.kcalOrigin === 'startingEstimate' ? 'starting estimate' : undefined} navigation onPress={() => onEdit('kcal')} />
    <SettingsRow label="Protein floor" value={`${state.proteinFloorG} g`} navigation onPress={() => onEdit('protein')} />
  </View>;
}
