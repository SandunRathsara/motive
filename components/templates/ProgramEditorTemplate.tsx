import { KeyboardAvoidingView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ProgramDraft, ProgramDraftTools, ProgramDraftValidation, ProgramEditorViewModel, SaveProgramResult } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { ProgramEditor } from '@/components/organisms/ProgramEditor';

/** S6 Training Program editor. Save sits in a bottom bar inside the form, in thumb reach (UX-8). */
export function ProgramEditorTemplate({ model, defaultRestSeconds, tools, validate, saving, errorText, onSave, onSaved }: {
  model: ProgramEditorViewModel;
  defaultRestSeconds: number;
  tools: ProgramDraftTools;
  validate: (draft: ProgramDraft) => ProgramDraftValidation;
  onSave: (draft: ProgramDraft) => Promise<SaveProgramResult>;
  saving?: boolean;
  errorText?: string;
  onSaved?: (changed: boolean) => void;
}) {
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={headerHeight} className="flex-1 bg-bg">
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1">
        {model.status === 'ready'
          ? <ProgramEditor model={model} defaultRestSeconds={defaultRestSeconds} tools={tools} validate={validate} saving={saving}
            errorText={errorText} onSave={onSave} onSaved={onSaved} />
          : <View className="gap-4 p-6">
            {model.status === 'loading' && <Text accessibilityLiveRegion="polite" className="text-lg text-muted">Loading your program…</Text>}
            {model.status === 'error' && <>
              <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your program. Your record hasn’t been changed.</Text>
              <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
            </>}
          </View>}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
