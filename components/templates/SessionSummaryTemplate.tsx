import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SessionSummaryViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { SessionSummary } from '@/components/organisms/SessionSummary';
import { UndoToast } from '@/components/organisms/UndoToast';

type UndoProps = Parameters<typeof UndoToast>[0];

/**
 * S5: closes the loop after a session (TRN-8). Done is the one primary action and stays pinned, so it
 * never needs a scroll. Corrections (edit sets, delete session) sit at the end of the content: one tap
 * each, no confirmation dialog, with the undo toast as the safety net (UX-12).
 */
export function SessionSummaryTemplate({ model, errorText, undo, onDone, onEditSets, onDeleteSession }: {
  model: SessionSummaryViewModel;
  /** Calm "Not saved" copy from a failed delete. */
  errorText?: string;
  undo: Pick<UndoProps, 'offer' | 'errorText' | 'onUndo'>;
  onDone: () => void;
  onEditSets: () => void;
  onDeleteSession: () => void;
}) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-6 p-6">
        {model.status === 'loading' ? <Text className="text-lg text-muted">Loading your summary…</Text>
          : model.status === 'error' ? (
            <View className="gap-4">
              <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your summary. Nothing was changed.</Text>
              <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
            </View>
          ) : model.status === 'missing' ? <Text className="text-lg text-muted">This session no longer exists.</Text>
            : (
              <>
                <SessionSummary content={model} />
                <View className="gap-3">
                  <ActionButton label="Edit sets" variant="secondary" onPress={onEditSets} />
                  <ActionButton label="Delete session" variant="destructive" onPress={onDeleteSession} />
                </View>
              </>
            )}
        {errorText && <Text accessibilityRole="alert" className="text-base text-danger">{errorText}</Text>}
      </ScrollView>
      <View className="gap-2 border-t border-line-soft px-6 pb-2 pt-3">
        <UndoToast offer={undo.offer} errorText={undo.errorText} onUndo={undo.onUndo} />
        <ActionButton label="Done" disabled={model.status === 'loading'} onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}
