import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { SetSheetViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { ChoiceGroup } from '@/components/molecules/ChoiceGroup';
import { formatQuantity } from '@/components/molecules/quantity';
import { Stepper } from '@/components/molecules/Stepper';

type SetType = SetSheetViewModel['type'];
type Field = 'load' | 'reps';
export interface SetSheetValues { loadKg: number | null; reps: number; type: SetType }

const typeOptions = [{ value: 'working', label: 'Working' }, { value: 'warmup', label: 'Warmup' }] as const;
const entryCopy = {
  load: { label: 'Load in kilograms', keyboardType: 'decimal-pad', error: 'Enter a load of 0 kg or more.' },
  reps: { label: 'Reps', keyboardType: 'number-pad', error: 'Enter a whole number of reps, 1 or more.' },
} as const;

function parseEntry(field: Field, text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  if (text.trim() === '' || !Number.isFinite(value)) return null;
  if (field === 'load') return value >= 0 && value <= 1000 ? Math.round(value * 100) / 100 : null;
  return Number.isInteger(value) && value >= 1 && value <= 999 ? value : null;
}

/**
 * S4: adjust one set (load, reps, working or warmup, delete). A bottom panel in the session screen, not a
 * `Modal`, so the session stays usable behind it (UX-10). Stepper changes are collected here and
 * committed once with the primary button, so a burst of taps is one edit (TRN-3, TRN-9). Delete is one
 * tap with no confirmation; the undo toast is the safety net (UX-12). Remount with `key={chipKey}`.
 */
export function SetSheet({ model, initialEntry = null, errorText, onSave, onDelete, onClose }: {
  model: SetSheetViewModel;
  /** Start in direct entry for a field, e.g. after a long-press on a card stepper. */
  initialEntry?: Field | null;
  errorText?: string;
  onSave: (values: SetSheetValues) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [loadKg, setLoadKg] = useState(model.loadKg);
  const [reps, setReps] = useState(model.reps);
  const [type, setType] = useState<SetType>(model.type);
  const [entry, setEntry] = useState<{ field: Field; text: string; error: boolean } | null>(
    initialEntry === null ? null : { field: initialEntry, text: formatQuantity(initialEntry === 'load' ? loadKg ?? 0 : reps), error: false },
  );
  const busy = model.saveState === 'saving';
  const needsLoad = !model.bodyweight && loadKg === null;

  const openEntry = (field: Field) => setEntry({ field, text: formatQuantity(field === 'load' ? loadKg ?? 0 : reps), error: false });
  const applyEntry = () => {
    if (!entry) return;
    const parsed = parseEntry(entry.field, entry.text);
    if (parsed === null) { setEntry({ ...entry, error: true }); return; }
    if (entry.field === 'load') setLoadKg(parsed); else setReps(parsed);
    setEntry(null);
  };
  const entryRow = (field: Field) => entry && entry.field === field && (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <TextInput accessibilityLabel={entryCopy[field].label} autoFocus keyboardType={entryCopy[field].keyboardType}
          value={entry.text} selectTextOnFocus onChangeText={(text) => setEntry({ field, text, error: false })}
          onSubmitEditing={applyEntry} returnKeyType="done"
          className="min-h-14 flex-1 rounded-sm border border-line bg-surface-2 px-4 py-3 text-xl text-text" />
        <Pressable accessibilityRole="button" accessibilityLabel={`Apply ${field === 'load' ? 'load' : 'reps'}`} onPress={applyEntry}
          className="min-h-14 min-w-[44px] items-center justify-center rounded-md border border-line bg-surface-2 px-4">
          <Text className="text-base text-text">Apply</Text>
        </Pressable>
      </View>
      {entry.error && <Text accessibilityRole="alert" className="text-base text-danger">{entryCopy[field].error}</Text>}
    </View>
  );

  return (
    <View className="rounded-t-lg border border-line bg-surface">
      <View className="flex-row items-center gap-3 px-4 pt-4">
        <Text accessibilityRole="header" className="flex-1 text-xl font-semibold text-text">{model.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}
          className="min-h-12 min-w-[44px] items-center justify-center rounded-md px-3">
          <Text className="text-base text-muted">Close</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" className="max-h-80" contentContainerClassName="gap-4 p-4">
        {!model.bodyweight && (entry?.field === 'load' ? entryRow('load') : (
          <Stepper label="Load" unit="kg" value={loadKg ?? 0} step={model.incrementKg} min={0}
            onChange={setLoadKg} onDirectEntry={() => openEntry('load')} />
        ))}
        {entry?.field === 'reps' ? entryRow('reps') : (
          <Stepper label="Reps" unit="reps" value={reps} step={1} min={1} onChange={setReps} onDirectEntry={() => openEntry('reps')} />
        )}
        <ChoiceGroup label="Set type" options={typeOptions} value={type} horizontal onChange={setType} />
        {model.canDelete && <ActionButton label="Delete set" variant="destructive" onPress={onDelete} />}
      </ScrollView>
      <View className="gap-2 border-t border-line-soft p-4">
        {needsLoad && <Text className="text-base text-muted">Set a load first</Text>}
        {errorText && <Text accessibilityRole="alert" className="text-base text-danger">{errorText}</Text>}
        <ActionButton label={busy ? 'Saving…' : model.isSaved ? 'Save changes' : 'Log set'} disabled={busy || needsLoad}
          onPress={() => onSave({ loadKg: model.bodyweight ? null : loadKg, reps, type })} />
      </View>
    </View>
  );
}
