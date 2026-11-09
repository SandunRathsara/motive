import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ActiveSessionActions, ActiveSessionViewModel, SetSheetViewModel } from '@/features/workouts';
import { ActionButton } from '@/components/atoms/ActionButton';
import { ElapsedTimer } from '@/components/molecules/ElapsedTimer';
import { ActiveSession } from '@/components/organisms/ActiveSession';
import { RestBar } from '@/components/organisms/RestBar';
import { UndoToast } from '@/components/organisms/UndoToast';

type UndoProps = Parameters<typeof UndoToast>[0];

/**
 * S3: the active session (also used to correct a finished one, G9). The exercises and set sheet scroll
 * above; the bottom controls (undo toast, rest bar, Finish) stay in the thumb zone (UX-8). Nothing here
 * blocks: the rest bar and toast are in-layout, and logging continues during rest (UX-10, TRN-7).
 */
export function ActiveSessionTemplate({ model, actions, sheet, errorText, undo, onFinish, onDone, onDeleteSession, onOpenHistory }: {
  model: ActiveSessionViewModel;
  actions: ActiveSessionActions;
  sheet: (chipKey: string) => SetSheetViewModel | null;
  /** Calm "Not saved" copy from the last failed commit (set, finish or delete). */
  errorText?: string;
  undo: Pick<UndoProps, 'offer' | 'errorText' | 'onUndo'>;
  /** Finish the active session; the route navigates to the summary with the id `actions.finish` resolves. */
  onFinish: () => void;
  /** Leave a finished session that was being corrected. */
  onDone: () => void;
  onDeleteSession: () => void;
  onOpenHistory?: (exerciseId: string) => void;
}) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-bg">
      {model.status === 'loading' ? (
        <View className="flex-1 p-6"><Text className="text-lg text-muted">Loading your session…</Text></View>
      ) : model.status === 'error' ? (
        <View className="flex-1 gap-4 p-6">
          <Text accessibilityRole="alert" className="text-lg text-muted">Couldn’t read your session. Nothing was changed.</Text>
          <ActionButton label="Try again" variant="secondary" onPress={model.retry} />
        </View>
      ) : (
        <>
          <View className="gap-1 px-4 pt-3">
            <View className="flex-row items-center gap-3">
              <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold text-text">{model.templateName}</Text>
              {model.active && <ElapsedTimer startedAt={model.startedAt} now={actions.now} />}
            </View>
            <View className="flex-row flex-wrap items-center gap-x-3">
              <Text className="text-base text-muted">{model.progressText}</Text>
              {model.deload && <Text className="text-base text-muted">Deload session</Text>}
              {!model.active && <Text className="text-base text-muted">Finished session</Text>}
              <Pressable accessibilityRole="button" accessibilityLabel="Delete session" onPress={onDeleteSession}
                className="min-h-12 min-w-[44px] justify-center">
                <Text className="text-base text-danger">Delete session</Text>
              </Pressable>
            </View>
          </View>
          <ActiveSession content={model} actions={actions} sheet={sheet} errorText={errorText} onOpenHistory={onOpenHistory} />
          <View className="gap-2 border-t border-line-soft px-4 pb-2 pt-3">
            <UndoToast offer={undo.offer} errorText={undo.errorText} onUndo={undo.onUndo} />
            {model.active && model.rest && (
              <RestBar deadlineMs={model.rest.deadlineMs} durationSeconds={model.rest.durationSeconds} now={actions.now}
                onAddThirty={actions.addThirtySeconds} onSkip={actions.skipRest} />
            )}
            {model.active
              ? <ActionButton testID="finish-session" label="Finish session" onPress={onFinish} />
              : <ActionButton label="Done" onPress={onDone} />}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
