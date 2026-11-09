import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ChipDraft, ExerciseCardViewModel } from '@/features/workouts';
import { SetChip } from '@/components/molecules/SetChip';
import { Stepper } from '@/components/molecules/Stepper';

export type DirectEntryField = 'load' | 'reps';

/**
 * One exercise of the active session (S3). Collapsed it is a single header row; expanded it lists the
 * set chips. One tap on a chip logs it as shown (TRN-3); the next unlogged chip also carries steppers
 * (load by the exercise's increment, reps by 1) so a change before logging stays on the card. Every chip
 * has an Edit control that opens the set sheet. Presentational: the view model carries all copy.
 */
export function ExerciseCard({ model, steppers = true, onFocusLayout, onOpenHistory, onToggle, onLogChip, onAdjust, onOpenSheet, onDirectEntry }: {
  model: ExerciseCardViewModel;
  /** False while the set sheet is open, so the same adjustable controls never appear twice. */
  steppers?: boolean;
  /** Reports where the next chip's block starts, measured from the top of this card, so the host can keep it in view. */
  onFocusLayout?: (y: number) => void;
  /** Opens this exercise's history across every template (TRN-5). */
  onOpenHistory?: (exerciseId: string) => void;
  onToggle: (templateExerciseId: string) => void;
  onLogChip: (chipKey: string) => void;
  onAdjust: (chipKey: string, values: Partial<ChipDraft>) => void;
  onOpenSheet: (chipKey: string) => void;
  onDirectEntry: (chipKey: string, field: DirectEntryField) => void;
}) {
  const focus = model.chips.find((chip) => chip.setId === null && chip.kind !== 'warmup');
  // The chip block's y is relative to the card body, and the body's to the card: both are needed.
  const offsets = useRef({ body: 0, block: 0 });
  const reportFocus = () => onFocusLayout?.(offsets.current.body + offsets.current.block);
  const headerLabel = `${model.name}, ${model.prescriptionText}, ${model.progressText}${model.complete ? ', done' : ''}`;
  return (
    <View className={`rounded-lg border bg-surface ${model.expanded ? 'border-accent' : 'border-line-soft'}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={headerLabel} accessibilityState={{ expanded: model.expanded }}
        accessibilityHint={model.expanded ? 'Hides the sets' : 'Shows the sets'} onPress={() => onToggle(model.templateExerciseId)}
        className="min-h-14 flex-row items-center gap-3 px-4 py-3">
        <View className="flex-1">
          <Text className="text-xl font-semibold text-text">{model.name}</Text>
          <Text className="text-base text-muted">{model.muscleGroupLabel} · {model.prescriptionText}</Text>
        </View>
        <View className="items-end">
          <Text className="text-base text-muted">{model.progressText}</Text>
          {model.complete && <Text className="text-base text-text">✓ Done</Text>}
        </View>
      </Pressable>
      {model.expanded && (
        <View onLayout={({ nativeEvent }) => { offsets.current.body = nativeEvent.layout.y; reportFocus(); }} className="gap-4 px-4 pb-4">
          {model.reasonLine && <Text className="text-base text-muted">{model.reasonLine}</Text>}
          {onOpenHistory && (
            <Pressable accessibilityRole="button" accessibilityLabel={`${model.name} history`} accessibilityHint="Opens every session with this exercise"
              onPress={() => onOpenHistory(model.exerciseId)} className="min-h-12 min-w-[44px] justify-center self-start">
              <Text className="text-base text-info">History</Text>
            </Pressable>
          )}
          {model.chips.map((chip) => (
            <View key={chip.key} className="gap-2"
              onLayout={chip === focus ? ({ nativeEvent }) => { offsets.current.block = nativeEvent.layout.y; reportFocus(); } : undefined}>
              <View className="flex-row flex-wrap items-center gap-x-3">
                <Text className="text-base text-muted">{chip.label}</Text>
                {chip.failedSet && <Text className="text-base text-muted">Failed Set</Text>}
              </View>
              <View className="flex-row items-center gap-2">
                <SetChip testID={chip === focus ? 'next-set-chip' : `set-chip-${chip.key}`} loadKg={chip.loadKg} reps={chip.reps} bodyweight={chip.bodyweight} recommended={chip.recommended}
                  last={chip.last ?? undefined} saveState={chip.saveState} onPress={() => onLogChip(chip.key)} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${chip.label}`}
                  accessibilityHint="Opens load, reps, set type and delete" onPress={() => onOpenSheet(chip.key)}
                  className="min-h-14 min-w-[44px] items-center justify-center rounded-md border border-line bg-surface-2 px-3">
                  <Text className="text-base text-text">Edit</Text>
                </Pressable>
              </View>
              {steppers && chip === focus && (
                <View className="gap-2">
                  {!chip.bodyweight && (
                    <Stepper label="Load" unit="kg" value={chip.loadKg ?? 0} step={model.incrementKg} min={0}
                      disabled={chip.saveState === 'saving'} onChange={(loadKg) => onAdjust(chip.key, { loadKg })}
                      onDirectEntry={() => onDirectEntry(chip.key, 'load')} />
                  )}
                  <Stepper label="Reps" unit="reps" value={chip.reps} step={1} min={1}
                    disabled={chip.saveState === 'saving'} onChange={(reps) => onAdjust(chip.key, { reps })}
                    onDirectEntry={() => onDirectEntry(chip.key, 'reps')} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
