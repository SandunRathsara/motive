import { useRef, useState } from 'react';
import { ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import type { ActiveSessionActions, ActiveSessionContent, ChipDraft, SetSheetViewModel } from '@/features/workouts';
import { ExerciseCard, type DirectEntryField } from './ExerciseCard';
import { SetSheet, type SetSheetValues } from './SetSheet';

type SheetState = { chipKey: string; entry: DirectEntryField | null };

/**
 * S3 body: the exercises of one session. The expanded exercise is docked at the bottom of the screen
 * (UX-8: primary controls in the bottom 40%) and every other exercise waits above as a collapsed row.
 * The set sheet (S4) opens below it as a panel, not a modal, so the session stays usable (UX-10). All
 * state here is ephemeral UI state; committed data and drafts live in the hook behind `actions`.
 */
export function ActiveSession({ content, actions, sheet, errorText, onOpenHistory }: {
  content: ActiveSessionContent;
  actions: ActiveSessionActions;
  /** The sheet model for a chip, or null when that chip no longer exists. */
  sheet: (chipKey: string) => SetSheetViewModel | null;
  /** Calm "Not saved" copy from the last failed commit. */
  errorText?: string;
  onOpenHistory?: (exerciseId: string) => void;
}) {
  const [sheetState, setSheetState] = useState<SheetState | null>(null);
  const current = content.exercises.find((exercise) => exercise.expanded) ?? null;
  const others = content.exercises.filter((exercise) => !exercise.expanded);
  const sheetModel = sheetState ? sheet(sheetState.chipKey) : null;

  const toggle = (templateExerciseId: string) => {
    setSheetState(null);
    actions.expand(content.exercises.find((exercise) => exercise.templateExerciseId === templateExerciseId)?.expanded ? null : templateExerciseId);
  };
  const adjust = (chipKey: string, values: Partial<ChipDraft>) => { void actions.adjust(chipKey, values); };
  const save = async (model: SetSheetViewModel, values: SetSheetValues) => {
    const saved = model.setId
      ? await actions.editSet(model.setId, values)
      : await actions.logSet({ templateExerciseId: model.templateExerciseId, type: values.type, loadKg: values.loadKg, reps: values.reps });
    if (saved) setSheetState(null);
  };
  const remove = async (model: SetSheetViewModel) => {
    if (model.setId && await actions.deleteSet(model.setId)) setSheetState(null);
  };
  // The docked panel shrinks when the rest bar or undo toast appears; follow the next chip so it is never hidden below the fold.
  const dock = useRef<ScrollViewInstance>(null);
  const followFocus = (y: number) => dock.current?.scrollTo({ y, animated: false });
  const card = (exercise: ActiveSessionContent['exercises'][number]) => (
    <ExerciseCard key={exercise.templateExerciseId} model={exercise} steppers={sheetModel === null} onFocusLayout={exercise.expanded ? followFocus : undefined}
      onOpenHistory={onOpenHistory} onToggle={toggle} onLogChip={(key) => { void actions.logChip(key); }}
      onAdjust={adjust} onOpenSheet={(chipKey) => setSheetState({ chipKey, entry: null })}
      onDirectEntry={(chipKey, entry) => setSheetState({ chipKey, entry })} />
  );

  return (
    <View testID="active-session" onTouchStart={() => actions.touch()} className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-3 px-4 py-3">
        {others.map(card)}
      </ScrollView>
      {current && (
        <ScrollView ref={dock} testID="current-exercise" keyboardShouldPersistTaps="handled" className="max-h-[55%] grow-0"
          contentContainerClassName="px-4 pb-3">
          {card(current)}
        </ScrollView>
      )}
      {errorText && !sheetModel && <Text accessibilityRole="alert" className="px-4 pb-2 text-base text-danger">{errorText}</Text>}
      {sheetModel && (
        <SetSheet key={`${sheetModel.chipKey}:${sheetState?.entry ?? ''}`} model={sheetModel} initialEntry={sheetState?.entry ?? null}
          errorText={errorText} onSave={(values) => { void save(sheetModel, values); }} onDelete={() => { void remove(sheetModel); }}
          onClose={() => setSheetState(null)} />
      )}
    </View>
  );
}
