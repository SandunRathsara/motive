import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useForm, useStore } from '@tanstack/react-form';
import type {
  ExerciseLibraryEntry, ProgramDraft, ProgramDraftTools, ProgramEditorViewModel, SaveProgramResult,
  SessionTemplate, TemplateExercise,
} from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { InlineNotice } from '@/components/atoms/InlineNotice';
import { CountStepper } from '@/components/molecules/CountStepper';
import { ShowMoreList } from '@/components/molecules/ShowMoreList';

type ReadyModel = Extract<ProgramEditorViewModel, { status: 'ready' }>;
type Outcome = { kind: 'saved'; changed: boolean } | { kind: 'failed' } | null;

const noun = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const sectionTitle = 'text-xl font-semibold text-text';
const fieldBox = 'min-h-14 rounded-sm border border-line bg-surface px-4 py-3 text-lg text-text';

function SmallButton({ label, onPress, disabled = false, destructive = false, text }: {
  label: string; onPress: () => void; disabled?: boolean; destructive?: boolean; text?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      className={`min-h-12 min-w-[44px] items-center justify-center rounded-md border px-4 py-2 ${destructive ? 'border-danger' : 'border-line'} bg-surface-2`}>
      <Text className={`text-base ${disabled ? 'text-muted' : destructive ? 'text-danger' : 'text-text'}`}>{text ?? label}</Text>
    </Pressable>
  );
}

function ErrorText({ text }: { text?: string }) {
  return text ? <Text selectable accessibilityRole="alert" className="text-base text-danger">{text}</Text> : null;
}

function ExercisePicker({ library, onPick, onClose }: {
  library: readonly ExerciseLibraryEntry[]; onPick: (exercise: ExerciseLibraryEntry) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches = library.filter((entry) => !needle
    || [entry.name, entry.muscleGroup, entry.equipment].some((field) => field.toLowerCase().includes(needle)));
  return (
    <View className="gap-3 rounded-md border border-line bg-surface-2 p-4">
      <TextInput accessibilityLabel="Search exercises" placeholder="Search by name, muscle or equipment" value={query} onChangeText={setQuery}
        autoCapitalize="none" autoCorrect={false} className={fieldBox} />
      {matches.length === 0
        ? <Text className="text-base text-muted">No exercises match “{query.trim()}”.</Text>
        : <ShowMoreList limit={5} noun="exercises">
          {matches.map((entry) => (
            <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Add ${entry.name}`}
              accessibilityHint={`${entry.muscleGroup}, ${entry.bodyweight ? 'bodyweight' : entry.equipment}`}
              onPress={() => onPick(entry)} className="min-h-14 min-w-[44px] justify-center rounded-md bg-surface px-4 py-2">
              <Text className="text-lg text-text">{entry.name}</Text>
              <Text className="text-base text-muted">{entry.muscleGroup} · {entry.bodyweight ? 'bodyweight' : entry.equipment}</Text>
            </Pressable>
          ))}
        </ShowMoreList>}
      <SmallButton label="Close exercise list" text="Close" onPress={onClose} />
    </View>
  );
}

function ExerciseEditor({ exercise, entry, expanded, first, last, defaultRestSeconds, errors, path, onToggle, onChange, onRestChange, onMove, onRemove }: {
  exercise: TemplateExercise; entry: ExerciseLibraryEntry | undefined; expanded: boolean; first: boolean; last: boolean;
  defaultRestSeconds: number; errors: Record<string, string>; path: string; onToggle: () => void;
  onChange: (patch: Partial<TemplateExercise>) => void; onRestChange: (seconds: number | undefined) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void;
}) {
  const name = entry?.name ?? exercise.exerciseId;
  const bodyweight = entry?.bodyweight ?? false;
  const { min, max } = exercise.repRange;
  const range = min === max ? `${min}` : `${min}–${max}`;
  const summary = `${exercise.workingSets} × ${range}${bodyweight ? '' : ` · +${exercise.incrementKg} kg`}`;
  const rest = exercise.restOverrideSeconds ?? defaultRestSeconds;
  const fieldErrors = [errors[`${path}.workingSets`], errors[`${path}.repRange`], errors[`${path}.incrementKg`], errors[`${path}.restOverrideSeconds`]];
  return (
    <View className="gap-3 rounded-md border border-line-soft bg-surface p-3">
      <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${summary}`} accessibilityState={{ expanded }} onPress={onToggle}
        className="min-h-12 min-w-[44px] justify-center">
        <Text className="text-lg text-text">{name}</Text>
        <Text className="text-base text-muted">{summary}</Text>
      </Pressable>
      {expanded && <View className="gap-3">
        <CountStepper label="Sets" unit="set" unitPlural="sets" value={exercise.workingSets} step={1} min={1} max={10}
          onChange={(workingSets) => onChange({ workingSets })} />
        <CountStepper label="Bottom of range" unit="rep" unitPlural="reps" value={min} step={1} min={1} max={max}
          onChange={(next) => onChange({ repRange: { min: next, max } })} />
        <CountStepper label="Top of range" unit="rep" unitPlural="reps" value={max} step={1} min={min} max={50}
          onChange={(next) => onChange({ repRange: { min, max: next } })} />
        {!bodyweight && <CountStepper label="Increment" unit="kg" value={exercise.incrementKg} step={0.5} min={0} max={25}
          onChange={(incrementKg) => onChange({ incrementKg })} />}
        <CountStepper label="Rest" unit="second" unitPlural="seconds" value={rest} step={15} min={15} max={600}
          valueText={exercise.restOverrideSeconds === undefined ? `${rest} s default` : undefined} onChange={onRestChange} />
        {exercise.restOverrideSeconds !== undefined && <SmallButton label="Use default rest" onPress={() => onRestChange(undefined)} />}
        {fieldErrors.map((text, index) => <ErrorText key={index} text={text} />)}
        <View className="flex-row flex-wrap gap-2">
          <SmallButton label={`Move ${name} up`} text="Up" disabled={first} onPress={() => onMove(-1)} />
          <SmallButton label={`Move ${name} down`} text="Down" disabled={last} onPress={() => onMove(1)} />
          <SmallButton label={`Remove ${name}`} text="Remove" destructive onPress={onRemove} />
        </View>
      </View>}
    </View>
  );
}

/**
 * S6 form: the weekly target, the rotation of Session Templates and each template's exercises. Form state
 * is TanStack Form; validation, ids and the editing rules come from the feature (`tools`). One Save is one
 * *Your edit* Plan Version, and the owner is told plainly when nothing changed or nothing was saved.
 */
export function ProgramEditor({ model, defaultRestSeconds, tools, saving = false, errorText, onSave, onSaved }: {
  model: ReadyModel;
  defaultRestSeconds: number;
  tools: ProgramDraftTools;
  onSave: (draft: ProgramDraft) => Promise<SaveProgramResult>;
  saving?: boolean;
  /** Calm "not saved" copy from the hook for a failed commit. */
  errorText?: string;
  onSaved?: (changed: boolean) => void;
}) {
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(model.draft.trainingProgram.rotation[0]?.id ?? null);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [pickerTemplateId, setPickerTemplateId] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const form = useForm({
    defaultValues: model.draft,
    validators: { onSubmit: ({ value }) => (tools.validate(value).valid ? undefined : 'Check the items marked below.') },
    onSubmit: async ({ value }) => {
      const result = await onSave(value);
      if (result.saved) { setOutcome({ kind: 'saved', changed: result.changed }); onSaved?.(result.changed); } else setOutcome({ kind: 'failed' });
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const rotation = values.trainingProgram.rotation;
  const validation = tools.validate(values);
  const errors = attempted ? validation.errors : {};
  const byId = new Map(model.library.map((entry) => [entry.id, entry]));
  const targetBounds = { min: Math.min(...model.weeklyTargetOptions), max: Math.max(...model.weeklyTargetOptions) };

  const edit = (change: (program: ProgramDraft['trainingProgram']) => ProgramDraft['trainingProgram']) => {
    form.setFieldValue('trainingProgram', (previous) => change(previous));
    setOutcome(null);
  };
  const editTemplate = (templateId: string, change: (template: SessionTemplate) => SessionTemplate) =>
    edit((program) => ({ ...program, rotation: program.rotation.map((template) => (template.id === templateId ? change(template) : template)) }));

  const editExercise = (templateId: string, exerciseId: string, change: (exercise: TemplateExercise) => TemplateExercise) =>
    editTemplate(templateId, (template) => ({ ...template, exercises: template.exercises.map((item) => (item.id === exerciseId ? change(item) : item)) }));

  const submit = () => {
    setAttempted(true);
    const current = tools.validate(form.state.values);
    if (!current.valid) {
      const failing = Object.keys(current.errors).map((key) => /^templates\.(\d+)/.exec(key)?.[1]).find((index) => index !== undefined);
      const template = failing === undefined ? undefined : form.state.values.trainingProgram.rotation[Number(failing)];
      if (template) setExpandedTemplateId(template.id);
    }
    void form.handleSubmit();
  };

  return (
    <View className="flex-1">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 p-6">
        <Text className="text-base text-muted">Editing from {model.versionLabel}</Text>

        <View className="gap-3 rounded-lg border border-line-soft bg-surface p-6">
          <Text accessibilityRole="header" className={sectionTitle}>Weekly target</Text>
          <CountStepper label="Weekly target" unit="session" unitPlural="sessions" value={values.weeklySessionTarget} step={1}
            min={targetBounds.min} max={targetBounds.max}
            onChange={(next) => { form.setFieldValue('weeklySessionTarget', next); setOutcome(null); }} />
          <ErrorText text={errors.weeklySessionTarget} />
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className={sectionTitle}>Rotation</Text>
          <ErrorText text={errors.rotation} />
          {rotation.map((template, templateIndex) => {
            const expanded = expandedTemplateId === template.id;
            const sets = template.exercises.reduce((sum, exercise) => sum + exercise.workingSets, 0);
            const flagged = Object.keys(errors).some((key) => key.startsWith(`templates.${templateIndex}.`));
            const label = template.name.trim() || 'Unnamed template';
            return (
              <View key={template.id} testID={`template-card-${template.id}`} className="gap-3 rounded-lg border border-line-soft bg-surface p-4">
                <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
                  accessibilityLabel={`${label}, ${noun(template.exercises.length, 'exercise')}, ${noun(sets, 'set')}${flagged ? ', needs attention' : ''}`}
                  onPress={() => { setExpandedTemplateId(expanded ? null : template.id); setPickerTemplateId(null); setExpandedExerciseId(null); }}
                  className="min-h-14 min-w-[44px] justify-center gap-1">
                  <Text className="text-xl text-text">{templateIndex + 1}. {label}</Text>
                  <Text className="text-base text-muted">{noun(template.exercises.length, 'exercise')} · {noun(sets, 'set')}</Text>
                  {flagged && !expanded && <Text className="text-base text-danger">Needs attention</Text>}
                </Pressable>
                {expanded && <View className="gap-4">
                  <TextInput accessibilityLabel="Template name" value={template.name} autoCapitalize="words"
                    onChangeText={(name) => editTemplate(template.id, (current) => ({ ...current, name }))} className={fieldBox} />
                  <ErrorText text={errors[`templates.${templateIndex}.name`]} />
                  {template.exercises.map((exercise, exerciseIndex) => (
                    <ExerciseEditor key={exercise.id} exercise={exercise} entry={byId.get(exercise.exerciseId)}
                      expanded={expandedExerciseId === exercise.id} first={exerciseIndex === 0} last={exerciseIndex === template.exercises.length - 1}
                      defaultRestSeconds={defaultRestSeconds} errors={errors} path={`templates.${templateIndex}.exercises.${exerciseIndex}`}
                      onToggle={() => setExpandedExerciseId(expandedExerciseId === exercise.id ? null : exercise.id)}
                      onChange={(patch) => editExercise(template.id, exercise.id, (current) => ({ ...current, ...patch }))}
                      onRestChange={(seconds) => editExercise(template.id, exercise.id, (current) => tools.withRest(current, seconds))}
                      onMove={(direction) => editTemplate(template.id, (current) => ({ ...current, exercises: tools.move(current.exercises, exerciseIndex, direction) }))}
                      onRemove={() => editTemplate(template.id, (current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) }))} />
                  ))}
                  <ErrorText text={errors[`templates.${templateIndex}.exercises`]} />
                  {pickerTemplateId === template.id
                    ? <ExercisePicker library={model.library} onClose={() => setPickerTemplateId(null)}
                      onPick={(entry) => {
                        const added = tools.newExercise(template.id, entry);
                        editTemplate(template.id, (current) => ({ ...current, exercises: [...current.exercises, added] }));
                        setPickerTemplateId(null);
                        setExpandedExerciseId(added.id);
                      }} />
                    : <SmallButton label={`Add exercise to ${label}`} text="Add exercise" onPress={() => setPickerTemplateId(template.id)} />}
                  <View className="flex-row flex-wrap gap-2">
                    <SmallButton label={`Move ${label} up in the rotation`} text="Up in rotation" disabled={templateIndex === 0}
                      onPress={() => edit((program) => ({ ...program, rotation: tools.move(program.rotation, templateIndex, -1) }))} />
                    <SmallButton label={`Move ${label} down in the rotation`} text="Down in rotation" disabled={templateIndex === rotation.length - 1}
                      onPress={() => edit((program) => ({ ...program, rotation: tools.move(program.rotation, templateIndex, 1) }))} />
                    <SmallButton label={`Delete ${label}`} text="Delete template" destructive
                      onPress={() => { edit((program) => ({ ...program, rotation: program.rotation.filter((item) => item.id !== template.id) })); setExpandedTemplateId(null); }} />
                  </View>
                  <Text className="text-base text-muted">Past sessions and set history are kept.</Text>
                </View>}
              </View>
            );
          })}
          <SmallButton label="New Session Template" text="New Session Template" onPress={() => {
            const created = tools.newTemplate(`Session ${rotation.length + 1}`);
            edit((program) => ({ ...program, rotation: [...program.rotation, created] }));
            setExpandedTemplateId(created.id);
            setExpandedExerciseId(null);
            setPickerTemplateId(null);
          }} />
        </View>
      </ScrollView>

      <View className="gap-3 border-t border-line-soft bg-bg px-6 py-4">
        {attempted && !validation.valid && <Text selectable accessibilityRole="alert" className="text-base text-danger">Check the items marked below.</Text>}
        <InlineNotice error={outcome?.kind === 'failed'}
          text={outcome?.kind === 'failed' ? errorText ?? 'Not saved. Nothing was changed. Try again.'
            : outcome?.kind === 'saved' ? (outcome.changed ? 'Saved as a new Plan Version.' : 'No changes to save.') : null} />
        <ActionButton label={saving ? 'Saving…' : 'Save'} accessibilityLabel={saving ? 'Saving…' : 'Save'} disabled={saving} onPress={submit} />
      </View>
    </View>
  );
}
